# UniLink — College Management System


## Run locally

```sh
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

## Production build

```sh
npm run build     # outputs static files to dist/
npm run preview   # serves dist/ locally to check the build
```

Deploy the `dist/` folder to any static host (Vercel, Netlify, Cloudflare Pages, Render static site).

Frontend environment variables: `GEMINI_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (without Supabase values the app uses a local in-browser mock database). Backend (`backend/`, FastAPI): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; run with `pip install -r backend/requirements.txt && uvicorn main:app --app-dir backend`. Database schema: `supabase/migrations.sql`.

