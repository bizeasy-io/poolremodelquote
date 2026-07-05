-- Fix: the max-5-photos check in migration 003's RLS policy referenced
-- `name` inside a correlated subquery that also selects from
-- storage.objects — the unqualified reference resolved to the subquery's
-- own row (o.name), not the row being inserted, so the count was always
-- self-matching and never actually capped anything. Enforce the limit with
-- a trigger instead, where NEW.name is unambiguous.

drop policy if exists "anon upload lead photos" on storage.objects;
create policy "anon upload lead photos"
  on storage.objects for insert
  to anon
  with check (
    bucket_id = 'lead-photos'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f-]+\.(jpg|jpeg|png|webp|heic|heif)$'
  );

create or replace function public.enforce_lead_photo_limit()
returns trigger as $$
begin
  if new.bucket_id = 'lead-photos' and (
    select count(*) from storage.objects
    where bucket_id = 'lead-photos'
      and name like split_part(new.name, '/', 1) || '/%'
  ) >= 5 then
    raise exception 'Maximum 5 photos per lead submission';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists lead_photo_limit_trigger on storage.objects;
create trigger lead_photo_limit_trigger
  before insert on storage.objects
  for each row execute function public.enforce_lead_photo_limit();
