from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import json
import os
import urllib.error
import urllib.request
from supabase import create_client, Client

app = FastAPI(title="UniLink API")

# CORS: allow the Vite frontend to call this API.
allowed_origins = [
    o.strip()
    for o in os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase configuration
url: str = os.environ.get("SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_ANON_KEY", "")
# For administrative tasks, service_role key is required
service_role_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# Clients are only created when configured, so the API (e.g. /ai/feedback) still starts without Supabase.
supabase: Optional[Client] = create_client(url, key) if url and key else None
admin_supabase: Optional[Client] = create_client(url, service_role_key) if url and service_role_key else None

# Gemini configuration (server-side only; the key is never sent to the browser).
GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def require_supabase() -> Client:
    if supabase is None:
        raise HTTPException(status_code=503, detail="Supabase is not configured on the server.")
    return supabase


class FeedbackRequest(BaseModel):
    assignment_title: str = Field(..., max_length=300)
    assignment_description: str = Field("", max_length=5000)
    submission_info: str = Field("", max_length=2000)


class FeedbackResponse(BaseModel):
    feedback: str
    model: str


class AssignmentSchema(BaseModel):
    title: str
    description: str
    due_date: datetime
    class_id: str

class ReviewSchema(BaseModel):
    feedback: str
    status: str # 'approved' | 'rejected'

async def verify_admin(authorization: str = Header(...)):
    # Simple mock check - in real scenario, verify JWT and role in profiles table
    # This is a placeholder for actual session/role validation
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    return True

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "supabase_configured": supabase is not None,
        "ai_configured": bool(GEMINI_API_KEY),
    }


@app.post("/ai/feedback", response_model=FeedbackResponse)
def ai_feedback(req: FeedbackRequest):
    """Generate constructive feedback for a submission with Gemini (server-side)."""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="AI feedback is not configured (GEMINI_API_KEY missing).")

    prompt = (
        f'You are an expert academic tutor. A student has submitted work for the assignment "{req.assignment_title}".\n'
        f"Assignment Description: {req.assignment_description}\n"
        f"Submission Context: {req.submission_info}\n\n"
        "Generate a professional, constructive, and helpful feedback message for the student. "
        "Limit to 3-4 sentences. Mention what they likely did well and where they can improve."
    )
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.7, "topP": 0.9},
    }
    request = urllib.request.Request(
        GEMINI_ENDPOINT.format(model=GEMINI_MODEL),
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Gemini API error ({e.code}).")
    except (urllib.error.URLError, TimeoutError):
        raise HTTPException(status_code=502, detail="Could not reach the Gemini API.")

    try:
        parts = data["candidates"][0]["content"]["parts"]
        text = "".join(p.get("text", "") for p in parts).strip()
    except (KeyError, IndexError, TypeError):
        text = ""
    if not text:
        raise HTTPException(status_code=502, detail="Gemini returned an empty response.")
    return FeedbackResponse(feedback=text, model=GEMINI_MODEL)


@app.post("/auth/register-login")
async def auth_handler(data: dict):
    return {"message": "Use Supabase Auth client-side for JWT flow"}

@app.delete("/admin/users/{user_id}")
async def purge_user(user_id: str, is_admin: bool = Depends(verify_admin)):
    if not admin_supabase:
        raise HTTPException(status_code=500, detail="Administrative services not configured.")
    
    try:
        # 1. Delete from Auth
        auth_res = admin_supabase.auth.admin.delete_user(user_id)
        
        # 2. Delete from Profiles (Supabase usually cascades, but we can be explicit)
        db_res = admin_supabase.table("profiles").delete().eq("id", user_id).execute()
        
        return {"status": "success", "message": f"User {user_id} purged from ecosystem."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/assignments")
async def create_assignment(assignment: AssignmentSchema):
    supabase = require_supabase()
    res = supabase.table("assignments").insert(assignment.dict()).execute()
    if res.data:
        return res.data[0]
    raise HTTPException(status_code=400, detail="Failed to create assignment")

@app.get("/assignments/{class_id}")
async def get_assignments(class_id: str):
    supabase = require_supabase()
    res = supabase.table("assignments").select("*").eq("class_id", class_id).execute()
    return res.data

@app.post("/submissions")
async def submit_assignment(assignment_id: str, student_id: str, file: UploadFile = File(...)):
    supabase = require_supabase()
    # 1. Upload to Supabase Storage
    file_bytes = await file.read()
    file_path = f"{assignment_id}/{student_id}_{file.filename}"
    storage_res = supabase.storage.from_("assignments").upload(file_path, file_bytes)
    
    # 2. Get Public URL
    url_res = supabase.storage.from_("assignments").get_public_url(file_path)
    
    # 3. Create DB Entry
    db_res = supabase.table("submissions").insert({
        "assignment_id": assignment_id,
        "student_id": student_id,
        "file_url": url_res,
        "status": "pending",
        "version": 1 # Simplified versioning logic
    }).execute()
    
    return db_res.data[0]

@app.put("/submissions/{submission_id}/review")
async def review_submission(submission_id: str, review: ReviewSchema):
    supabase = require_supabase()
    res = supabase.table("submissions").update({
        "feedback": review.feedback,
        "status": review.status
    }).eq("id", submission_id).execute()
    
    return res.data[0]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
