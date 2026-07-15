-- Phase 4 migration: the contractor Rate Card + Materials Catalog store.
-- Mirrors the Phase 3 approach (leads.measurement): one jsonb column holds the
-- entire card (categories → labor lines + material bands/products), a second
-- holds the contractor settings block (§2). Keeping it jsonb lets the card
-- schema evolve (add-line, add-band, add-category, new §19 fields) without a
-- migration while its shape stabilizes; the load-time merge in schema.js
-- reconciles stored cards against a newer skeleton.
--
-- Keyed by contractor_id = auth user id, matching the tech_availability pattern.
-- One tech = one contractor today; multi-tenant scoping arrives with Phase 7.

create table if not exists contractor_rate_card (
  contractor_id uuid primary key references auth.users (id) on delete cascade,
  card jsonb,      -- categories + concrete block (the DATA STORE, §1)
  settings jsonb,  -- projection & pricing-function block (§2)
  updated_at timestamptz default now()
);

alter table contractor_rate_card enable row level security;

-- Same posture as the rest of the rep app: authenticated users operate on their
-- own row. (Phase 7 tightens this into real per-contractor tenancy.)
drop policy if exists "own rate card" on contractor_rate_card;
create policy "own rate card" on contractor_rate_card
  for all
  using (auth.uid() = contractor_id)
  with check (auth.uid() = contractor_id);
