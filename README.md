# poolremodelquote.com — Phase 1: Lead Capture

## What this is
The public-facing lead capture page. Customer fills out the form, submits, gets a confirmation. You get a text.

## Deploy to Netlify

The site auto-deploys to Netlify on every push to `main` (Netlify's GitHub
integration builds from this repo). Build config lives in `netlify.toml`.

First-time setup:
1. Push this folder to a GitHub repo
2. Go to netlify.com → Add new site → Import an existing project → pick this repo
3. Build command `npm run build`, publish directory `dist` (already set in `netlify.toml`; Vite auto-detected otherwise)
4. Add your domain: Site settings → Domains → add poolremodelquote.com
5. Point your domain's DNS at Netlify (in your registrar's DNS settings)

Note: pushing to `main` deploys the **frontend only**. Supabase schema changes
(`supabase/migrations/*`) are applied to the database separately — they do not
run as part of a Netlify deploy.

## Next: wire up the backend (Phase 1 backend)
The form currently simulates a submission. To make it real:
- Create a Supabase project
- Create a `leads` table (see schema below)
- Add a Supabase Edge Function to handle form POST + trigger Twilio SMS
- Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify environment variables (Site settings → Environment variables)

## Supabase leads table schema
```sql
create table leads (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  name text not null,
  phone text not null,
  email text,
  address text not null,
  work_types text[],
  finish text,
  notes text,
  photo_urls text[],
  status text default 'new',
  contractor_id uuid
);
```
