-- ============================================================================
-- SARAYAH — MARKETPLACE PHASE 5 (secure venue claiming)
-- ============================================================================
-- Lets an OWNER/VENDOR claim a listing that isn't linked to their account yet:
--   • If the listing's owner_email == the caller's OWN verified login email
--     (lower/trim) → AUTO-CLAIM immediately (provable ownership).
--   • Otherwise → create a PENDING claim request that an ADMIN must approve
--     (no automatic ownership transfer).
-- Security is enforced in these SECURITY DEFINER functions + RLS:
--   - Only profiles.role in ('owner','vendor') can claim.
--   - A vendor can NEVER take a venue already owned by someone else.
--   - Admin-only approval assigns ownership for non-email-matched claims.
-- Idempotent + additive.
-- ============================================================================

create table if not exists venue_claims (
  id         text primary key default ('cl' || replace(gen_random_uuid()::text,'-','')),
  venue_id   text not null references venues(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  status     text not null default 'pending',   -- pending | approved | rejected | auto
  created_at timestamptz default now(),
  unique (venue_id, user_id)
);
create index if not exists venue_claims_user_idx    on venue_claims(user_id);
create index if not exists venue_claims_pending_idx on venue_claims(status) where status = 'pending';

alter table venue_claims enable row level security;
drop policy if exists "venue_claims_own_select" on venue_claims;
drop policy if exists "venue_claims_admin_all"  on venue_claims;
-- A user sees only their OWN claims; admins see/manage all. Inserts happen only
-- through the SECURITY DEFINER function below (not direct table writes).
create policy "venue_claims_own_select" on venue_claims for select to authenticated using (user_id = auth.uid());
create policy "venue_claims_admin_all"  on venue_claims for all    to authenticated using (is_admin()) with check (is_admin());
grant select on venue_claims to authenticated;

-- Claim a listing by its id OR slug (the vendor pastes their venue link/slug).
create or replace function public.vendor_claim_venue(p_ident text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_email text;
  v_venue public.venues;
begin
  if auth.uid() is null then
    return jsonb_build_object('status','error','reason','not_authenticated');
  end if;
  -- Only owner/vendor accounts may claim.
  if not exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('owner','vendor')) then
    return jsonb_build_object('status','error','reason','not_a_vendor');
  end if;

  select * into v_venue from public.venues where id = p_ident or slug = p_ident limit 1;
  if v_venue.id is null then
    return jsonb_build_object('status','error','reason','not_found');
  end if;

  -- Never allow taking a venue already owned by a different account.
  if v_venue.claimed_by_user_id is not null and v_venue.claimed_by_user_id <> auth.uid() then
    return jsonb_build_object('status','error','reason','already_claimed');
  end if;
  if v_venue.claimed_by_user_id = auth.uid() then
    return jsonb_build_object('status','claimed','reason','already_yours','venue_id',v_venue.id);
  end if;

  select lower(trim(email)) into v_email from auth.users where id = auth.uid();

  -- Email match → provable ownership → auto-claim.
  if v_venue.owner_email is not null and v_email is not null
     and lower(trim(v_venue.owner_email)) = v_email then
    update public.venues set claimed_by_user_id = auth.uid() where id = v_venue.id;
    insert into public.venue_claims (venue_id, user_id, status) values (v_venue.id, auth.uid(), 'auto')
      on conflict (venue_id, user_id) do update set status = 'auto';
    return jsonb_build_object('status','claimed','reason','email_match','venue_id',v_venue.id);
  end if;

  -- Otherwise → pending request for admin review (no ownership yet).
  insert into public.venue_claims (venue_id, user_id, status) values (v_venue.id, auth.uid(), 'pending')
    on conflict (venue_id, user_id) do update set status = 'pending';
  return jsonb_build_object('status','pending','venue_id',v_venue.id);
end; $$;
revoke execute on function public.vendor_claim_venue(text) from public, anon;
grant execute on function public.vendor_claim_venue(text) to authenticated;

-- The caller's own claim requests (with venue name), for their dashboard.
create or replace function public.vendor_my_claims()
returns table (id text, venue_id text, venue_name text, status text, created_at timestamptz)
language sql security definer set search_path = public stable as $$
  select c.id, c.venue_id, v.name, c.status, c.created_at
  from public.venue_claims c join public.venues v on v.id = c.venue_id
  where c.user_id = auth.uid()
  order by c.created_at desc;
$$;
revoke execute on function public.vendor_my_claims() from public, anon;
grant execute on function public.vendor_my_claims() to authenticated;

-- Admin: pending claim requests to review.
create or replace function public.admin_list_claims()
returns table (id text, venue_id text, venue_name text, claimant_email text, status text, created_at timestamptz)
language sql security definer set search_path = public stable as $$
  select c.id, c.venue_id, v.name, u.email::text, c.status, c.created_at
  from public.venue_claims c
  join public.venues v on v.id = c.venue_id
  join auth.users u on u.id = c.user_id
  where is_admin() and c.status = 'pending'
  order by c.created_at desc;
$$;
revoke execute on function public.admin_list_claims() from public, anon;
grant execute on function public.admin_list_claims() to authenticated;

-- Admin: approve (assign ownership) or reject a claim request.
create or replace function public.admin_approve_claim(p_claim_id text, p_approve boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.venue_claims;
begin
  if not is_admin() then return jsonb_build_object('status','error','reason','not_admin'); end if;
  select * into c from public.venue_claims where id = p_claim_id;
  if c.id is null then return jsonb_build_object('status','error','reason','not_found'); end if;
  if p_approve then
    update public.venues set claimed_by_user_id = c.user_id where id = c.venue_id;
    update public.venue_claims set status = 'approved' where id = p_claim_id;
    return jsonb_build_object('status','approved');
  else
    update public.venue_claims set status = 'rejected' where id = p_claim_id;
    return jsonb_build_object('status','rejected');
  end if;
end; $$;
revoke execute on function public.admin_approve_claim(text, boolean) from public, anon;
grant execute on function public.admin_approve_claim(text, boolean) to authenticated;
