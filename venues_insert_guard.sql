-- ============================================================================
-- SARAYAH — VENUES MODERATION GUARD (defense-in-depth)
-- ============================================================================
-- The venues table allows public INSERT (RLS: with check (true)) so the free
-- listing flow works with the anon key. The /api/venues route forces the safe
-- moderation defaults, but the anon key is PUBLIC, so a technical user could
-- POST directly to PostgREST (/rest/v1/venues) and set status='approved' /
-- verification_status='verified', bypassing review.
--
-- This trigger forces the moderation-critical columns for ANY non-admin insert,
-- regardless of the payload — closing the bypass at the database (authoritative)
-- layer without changing the legitimate API flow (which already sets these).
-- Idempotent + additive. Run once in the Supabase SQL Editor.
--
-- FIRST, confirm the bypass is reachable (read-only):
--   select grantee, privilege_type
--   from information_schema.role_table_grants
--   where table_schema='public' and table_name='venues'
--     and grantee in ('anon','authenticated') and privilege_type='INSERT';
-- If 'anon' has INSERT, the bypass is reachable and this guard is needed.
-- ============================================================================

create or replace function public.venues_force_moderation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Non-admins can never self-approve/verify. Admins (public.admins via
  -- is_admin()) are unaffected. The normal API flow inserts with the anon key,
  -- so is_admin() is false there too and the safe defaults are enforced.
  if not public.is_admin() then
    new.status := 'pending_review';
    new.verification_status := 'unverified';
    new.verified_at := null;
    new.verified_by_admin := null;
    new.approved_at := null;
    new.suspended_at := null;
    new.rejected_at := null;
  end if;
  return new;
end; $$;

drop trigger if exists venues_force_moderation_ins on public.venues;
create trigger venues_force_moderation_ins
  before insert on public.venues
  for each row execute function public.venues_force_moderation();
