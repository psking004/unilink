# UniLink — College Management Portal

UniLink is a role-based college portal where **students**, **faculty** and **administrators** each get their own dashboard for courses, assignments and submission reviews. Faculty can draft review feedback with AI (Google Gemini), generated securely on the backend so no API key is ever shipped to the browser.

It runs against a real **Supabase** project, or — with no configuration at all — on a built-in **localStorage mock database**, so you can try the whole app locally in seconds.

## Features

- **Separate portals and logins** for students, faculty and admins.
- **Students:** browse the course catalog, enroll in classes, view assignments, upload submissions and resubmissions, and get notifications when work is reviewed.
- **Faculty:** create classes and assignments (with optional attachments), see enrolled students, review submissions, and approve, reject or request a resubmission with written feedback.
- **AI-assisted feedback:** one click drafts 3–4 sentences of constructive feedback via Gemini, which the teacher can edit before sending.
- **Admins:** manage users (approve new faculty accounts, remove users), monitor all submissions, and view system alerts.
- **Supabase or offline mode:** Supabase Auth, Postgres (with row-level security) and Storage in production; an in-browser mock of the same API when Supabase isn't configured.
- **Responsive UI** built with Tailwind CSS.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS |
| Backend | Python, FastAPI, Uvicorn |
| Data / Auth / Storage | Supabase (Postgres + RLS, Auth, Storage), localStorage mock fallback |
| AI | Google Gemini API (`gemini-3.8-flash` by default), called server-side |

## Architecture

```
React (Vite)  ──►  Supabase (auth, database, storage)      # or the localStorage mock
     │
     └──►  FastAPI backend  ──►  Gemini API                 # POST /ai/feedback, key stays on the server
```

## Project structure

```
App.tsx, index.tsx        App shell and routing between portals
components/               Login screens and the Student / Teacher / Admin dashboards
services/geminiService.ts Frontend client for the backend's /ai/feedback endpoint
supabaseClient.ts         Supabase client, with a localStorage mock when unconfigured
backend/main.py           FastAPI app (AI feedback, assignments, submissions, admin)
supabase/migrations.sql   Database policies and schema changes
```

## Getting started

### Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- (Optional) a Supabase project and a Gemini API key from [Google AI Studio](https://aistudio.google.com/)

### 1. Frontend

```sh
npm install
cp .env.example .env.local   # optional: fill in Supabase values
npm run dev                  # http://localhost:3000
```

With no Supabase values the app uses the local mock database, so this step alone is enough to explore the UI.

### 2. Backend (needed for AI feedback)

```sh
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # add GEMINI_API_KEY (and Supabase values if you have them)
set -a && source .env && set +a
uvicorn main:app --reload --port 8000
```

Check it's running at http://localhost:8000/health, and see the interactive API docs at http://localhost:8000/docs.

### 3. Database (Supabase only)

Run `supabase/migrations.sql` in the Supabase SQL editor to apply the row-level security policies and schema updates.

## Environment variables

**Frontend** (`.env.local` — these values are bundled into the browser, so only put public values here):

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | URL of the FastAPI backend. Default `http://localhost:8000`. |
| `VITE_SUPABASE_URL` | Supabase project URL. Leave empty to use the mock database. |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon key. |

**Backend** (`backend/.env` — private, never commit):

| Variable | Description |
| --- | --- |
| `GEMINI_API_KEY` | Gemini API key used by `POST /ai/feedback`. |
| `GEMINI_MODEL` | Optional model override. Default `gemini-3.8-flash`. |
| `ALLOWED_ORIGINS` | Comma-separated frontend origins allowed by CORS. Default `http://localhost:3000`. |
| `SUPABASE_URL` | Supabase project URL (database endpoints are disabled when empty). |
| `SUPABASE_ANON_KEY` | Supabase anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key for admin actions such as deleting users. |

## API overview

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Status, plus whether Supabase and AI are configured |
| POST | `/ai/feedback` | Generate feedback for a submission with Gemini |
| POST | `/assignments` | Create an assignment |
| GET | `/assignments/{class_id}` | List a class's assignments |
| POST | `/submissions` | Upload a submission to Supabase Storage |
| PUT | `/submissions/{submission_id}/review` | Save review feedback and status |
| DELETE | `/admin/users/{user_id}` | Remove a user (admin) |

## Build for production

```sh
npm run build     # static files in dist/
npm run preview   # serve dist/ locally
```

Deploy `dist/` to any static host (Vercel, Netlify, Cloudflare Pages, Render static site), deploy `backend/` to a Python host (for example Render or Railway), and point `VITE_API_URL` at the deployed backend and `ALLOWED_ORIGINS` at the deployed frontend.

## Security notes

- The Gemini API key lives only on the backend; the browser bundle never contains it.
- Only the Supabase **anon** key is exposed to the frontend, as Supabase intends; access is enforced by row-level security policies.
