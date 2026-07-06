-- Phase 2B migration: self-booking tokens, tech availability, nurture log
-- Run in Supabase SQL Editor.

-- 1. Self-booking token — the capability key in every nurture text link.
--    Unguessable UUID; knowing it = permission to book for that one lead.
alter table leads add column if not exists booking_token uuid unique default gen_random_uuid();
update leads set booking_token = gen_random_uuid() where booking_token is null;

-- 2. Per-tech availability (drives BOTH the tech booking calendar and the
--    customer self-booking page). days_of_week: [sun,mon,tue,wed,thu,fri,sat]
create table if not exists tech_availability (
  tech_id uuid primary key,
  days_of_week boolean[] not null default '{false,true,true,true,true,true,true}',
  start_hour int not null default 8,
  end_hour int not null default 18,
  slot_minutes int not null default 90,
  updated_at timestamptz default now()
);

alter table tech_availability enable row level security;

drop policy if exists "authenticated read availability" on tech_availability;
create policy "authenticated read availability"
  on tech_availability for select to authenticated using (true);

drop policy if exists "authenticated upsert availability" on tech_availability;
create policy "authenticated upsert availability"
  on tech_availability for insert to authenticated with check (true);

drop policy if exists "authenticated update availability" on tech_availability;
create policy "authenticated update availability"
  on tech_availability for update to authenticated using (true);

-- 3. Nurture message log — powers the scheduler and debugging
create table if not exists nurture_messages (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references leads(id) not null,
  step int not null,                -- 0 = day-0, 1 = day-1, 2 = day-3
  sent_at timestamptz default now(),
  delivery_status text default 'sent'
);

create index if not exists nurture_messages_lead_idx on nurture_messages (lead_id);

alter table nurture_messages enable row level security;

drop policy if exists "authenticated read nurture log" on nurture_messages;
create policy "authenticated read nurture log"
  on nurture_messages for select to authenticated using (true);

-- 4. Helpful index for the scheduler's scans
create index if not exists leads_status_idx on leads (status);

-- 5. Cron: run the nurture scheduler every 30 minutes.
--    REQUIRES the pg_cron and pg_net extensions (Dashboard → Database →
--    Extensions → enable both), and replace YOUR_CRON_SECRET with the same
--    value you set as the CRON_SECRET function secret.
--    If you prefer, skip this block and schedule it from Dashboard →
--    Integrations → Cron instead (same URL, same header).
--
-- select cron.schedule(
--   'nurture-tick-every-30-min',
--   '*/30 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://wxzqzfjktudupnxijdka.supabase.co/functions/v1/nurture-tick',
--     headers := '{"Content-Type": "application/json", "x-cron-secret": "YOUR_CRON_SECRET"}'::jsonb,
--     body := '{}'::jsonb
--   );
--   $$
-- );
