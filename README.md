# poolremodelquote.com — Phase 1: Lead Capture

## What this is
The public-facing lead capture page. Customer fills out the form, submits, gets a confirmation. You get a text.

## Deploy to Vercel (5 minutes)

1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → import your repo
3. Framework: Vite (auto-detected)
4. Add your domain: Project Settings → Domains → add poolremodelquote.com
5. Update your domain's nameservers to Vercel's (in your registrar's DNS settings)

## Next: wire up the backend (Phase 1 backend)
The form currently simulates a submission. To make it real:
- Create a Supabase project
- Create a `leads` table (see schema below)
- Add a Supabase Edge Function to handle form POST + trigger Twilio SMS
- Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel environment variables

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
