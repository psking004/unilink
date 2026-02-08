
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Header
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import os
from supabase import create_client, Client

app = FastAPI()

# Supabase configuration
url: str = os.environ.get("SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_ANON_KEY", "")
# For administrative tasks, service_role key is required
service_role_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

supabase: Client = create_client(url, key)
admin_supabase: Client = create_client(url, service_role_key) if service_role_key else None

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
    res = supabase.table("assignments").insert(assignment.dict()).execute()
    if res.data:
        return res.data[0]
    raise HTTPException(status_code=400, detail="Failed to create assignment")

@app.get("/assignments/{class_id}")
async def get_assignments(class_id: str):
    res = supabase.table("assignments").select("*").eq("class_id", class_id).execute()
    return res.data

@app.post("/submissions")
async def submit_assignment(assignment_id: str, student_id: str, file: UploadFile = File(...)):
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
    res = supabase.table("submissions").update({
        "feedback": review.feedback,
        "status": review.status
    }).eq("id", submission_id).execute()
    
    return res.data[0]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
