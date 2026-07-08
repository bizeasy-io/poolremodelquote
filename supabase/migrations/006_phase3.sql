-- Phase 3 migration: store the full field measurement as JSON on the lead.
-- One jsonb column holds the entire measure record (perimeter, floor sections,
-- depths, tile LFs, spa tree, deck, cage, rails, damage). Phase 4's pricing
-- engine reads from here; keeping it jsonb means the measure schema can evolve
-- without migrations while its shape stabilizes.

alter table leads add column if not exists measurement jsonb;

-- No RLS change needed: existing "authenticated users" policies on leads
-- already cover this column. Multi-tenant scoping arrives with Phase 7.
