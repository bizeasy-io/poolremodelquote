-- Phase 2A migration: appointments, lead lifecycle columns, tech read/write access
-- Run in Supabase SQL Editor (or supabase db push if using CLI migrations)

-- 1. Lead lifecycle columns
alter table leads add column if not exists tech_notes text;
alter table leads add column if not exists last_contact_attempt_at timestamptz;
alter table leads add column if not exists nurture_step int default 0;
alter table leads add column if not exists replied_at timestamptz;
alter table leads add column if not exists archived_at timestamptz;

-- status values used across phases:
-- new / attempted / nurturing / booked / measured / quoted / sold / archived
-- (text column already exists with default 'new'; no enum so 2B can extend freely)

-- 2. Appointments table
create table if not exists appointments (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  lead_id uuid references leads(id) not null,
  contractor_id uuid,
  tech_id uuid,
  scheduled_at timestamptz not null,
  status text not null default 'upcoming',        -- upcoming / completed / no_access / canceled
  booked_by text not null default 'tech',         -- tech / customer_self
  someone_home boolean,
  dogs_on_property boolean,
  cage_door_locked boolean,
  access_notes text
);

create index if not exists appointments_scheduled_at_idx on appointments (scheduled_at);
create index if not exists appointments_lead_id_idx on appointments (lead_id);

-- 3. Row Level Security
alter table appointments enable row level security;

-- Logged-in techs can read and write everything (single-tenant for now;
-- these policies get contractor_id scoping when the marketplace phase lands)
drop policy if exists "authenticated read leads" on leads;
create policy "authenticated read leads"
  on leads for select to authenticated using (true);

drop policy if exists "authenticated update leads" on leads;
create policy "authenticated update leads"
  on leads for update to authenticated using (true);

drop policy if exists "authenticated read appointments" on appointments;
create policy "authenticated read appointments"
  on appointments for select to authenticated using (true);

drop policy if exists "authenticated insert appointments" on appointments;
create policy "authenticated insert appointments"
  on appointments for insert to authenticated with check (true);

drop policy if exists "authenticated update appointments" on appointments;
create policy "authenticated update appointments"
  on appointments for update to authenticated using (true);
