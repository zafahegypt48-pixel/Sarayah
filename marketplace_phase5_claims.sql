-- ============================================================================
-- SARAYAH — MARKETPLACE PHASE 5 (secure venue claiming) — v2
-- ============================================================================
-- Any AUTHENTICATED user can file a claim for a listing that isn't linked to
-- their account yet. The database decides what happens:
--   • owner_email == caller's OWN verified login email (lower/trim)
--       → AUTO-CLAIM immediately (provable ownership).
--   • otherwise
--       → a PENDING request an ADMIN must approve (no ownership transfer yet).
-- Security model:
--   - Filing a request is open to any logged-in user (the request itself grants
--     nothing). The REAL gate is admin approval, which assigns ownership.
--   - A user can NEVER take a venue already owned by someone else.
--   - Only admins (public.admins via is_admin()) can list/approve claims.
-- Idempotent + additive: safe to re-run over an existing install.
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

-- Claim a listing by its id OR slug (the user pastes their venue link/slug).
-- Open to ANY authenticated user: filing a pending request grants nothing until
-- an admin approves. Auto-claim only fires on a provable email match.
create or replace function public.vendor_claim_venue(p_ident text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_email text;
  v_venue public.venues;
begin
  if auth.uid() is null then
    return jsonb_build_object('status','error','reason','not_authenticated');
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

  -- Otherwise → pending request for admin review (no ownership yet). Re-filing a
  -- previously rejected/pending request simply resets it to pending.
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

-- Admin: FULL claim review data — every claim (pending first), each with the
-- claimant's profile/account, the complete venue row, contact + proof details,
-- and uploaded verification document paths. Returns a jsonb array. Gated by
-- is_admin() so a non-admin gets an empty array even if they reach the function.
create or replace function public.admin_list_claims()
returns jsonb language sql security definer set search_path = public stable as $$
  select coalesce(jsonb_agg(obj order by is_pending desc, created_at desc), '[]'::jsonb)
  from (
    select
      (c.status = 'pending') as is_pending,
      c.created_at,
      jsonb_build_object(
        'id',         c.id,
        'status',     c.status,
        'created_at', c.created_at,
        'venue_id',   c.venue_id,
        'email_matches',
          (v.owner_email is not null and lower(trim(v.owner_email)) = lower(trim(u.email::text))),
        'claimant', jsonb_build_object(
          'user_id',   c.user_id,
          'email',     u.email,
          'full_name', p.full_name,
          'phone',     p.phone,
          'role',      p.role,
          'locale',    p.locale
        ),
        'venue', jsonb_build_object(
          'id',                     v.id,
          'name',                   v.name,
          'slug',                   v.slug,
          'type',                   v.type,
          'city',                   v.city,
          'area',                   v.area,
          'status',                 v.status,
          'verification_status',    v.verification_status,
          'claimed_by_user_id',     v.claimed_by_user_id,
          'owner_name',             v.owner_name,
          'owner_role',             v.owner_role,
          'owner_email',            v.owner_email,
          'owner_phone',            v.owner_phone,
          'owner_whatsapp',         v.owner_whatsapp,
          'official_website',       v.official_website,
          'google_maps_link',       v.google_maps_link,
          'social_link',            v.social_link,
          'authorization_confirmed',v.authorization_confirmed,
          'admin_notes',            v.admin_notes,
          'verification_method',    v.verification_method,
          'verification_notes',     v.verification_notes,
          'verification_docs',      v.verification_docs,
          'images',                 v.images,
          'created_at',             v.created_at
        )
      ) as obj
    from public.venue_claims c
    join public.venues v   on v.id = c.venue_id
    join auth.users u      on u.id = c.user_id
    left join public.profiles p on p.user_id = c.user_id
    where is_admin()
  ) s;
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
    -- Assign ownership AND publish the listing. Approving a claim means an admin
    -- has vetted this owner + venue, so a still-unreviewed listing goes live and
    -- stops showing as "Pending review" in the vendor's My listings. Only a
    -- not-yet-live (pending_review / null) venue is promoted — an intentionally
    -- suspended or rejected venue is left as-is (assign ownership only).
    update public.venues
      set claimed_by_user_id = c.user_id,
          status       = case when coalesce(status, 'pending_review') = 'pending_review'
                              then 'approved' else status end,
          approved_at  = case when coalesce(status, 'pending_review') = 'pending_review'
                              then now() else approved_at end
      where id = c.venue_id;
    update public.venue_claims set status = 'approved' where id = p_claim_id;
    return jsonb_build_object('status','approved','venue_id',c.venue_id,'user_id',c.user_id);
  else
    update public.venue_claims set status = 'rejected' where id = p_claim_id;
    return jsonb_build_object('status','rejected','venue_id',c.venue_id);
  end if;
end; $$;
revoke execute on function public.admin_approve_claim(text, boolean) from public, anon;
grant execute on function public.admin_approve_claim(text, boolean) to authenticated;
