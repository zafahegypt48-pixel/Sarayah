-- ============================================================================
-- SARAYAH — MARKETPLACE PHASE 4 (vendor self-service)
-- ============================================================================
-- Lets a logged-in vendor manage THEIR OWN listings + see THEIR OWN inquiries —
-- WITHOUT giving the authenticated role broad UPDATE on venues (which would let a
-- vendor self-approve). All access is via SECURITY DEFINER functions gated on
-- claimed_by_user_id = auth.uid(), and the update function only writes safe
-- columns (never status / verification). Idempotent + additive.
-- ============================================================================

-- A vendor's own listings (all statuses — so they can see pending/rejected too).
-- Ownership is `claimed_by_user_id = auth.uid()`. But the /add-venue form is
-- public, so a listing created before the vendor logged in (or during an auth
-- hiccup) has claimed_by_user_id = NULL and would otherwise be invisible. We
-- therefore ALSO link by the email the vendor typed on the form (`owner_email`)
-- when it equals their OWN verified login email — and back-fill the link so it
-- becomes permanent and the listing becomes editable. A vendor can only ever
-- claim rows whose owner_email matches their own confirmed account email, so
-- they can never see or claim another vendor's venues.
create or replace function public.vendor_list_listings()
returns setof public.venues
language plpgsql security definer set search_path = public as $$
declare
  v_email text;
begin
  select lower(trim(email)) into v_email from auth.users where id = auth.uid();

  if v_email is not null and v_email <> '' then
    update public.venues
    set claimed_by_user_id = auth.uid()
    where claimed_by_user_id is null
      and owner_email is not null
      and lower(trim(owner_email)) = v_email;
  end if;

  return query
    select * from public.venues
    where claimed_by_user_id = auth.uid()
    order by created_at desc;
end; $$;
revoke execute on function public.vendor_list_listings() from public, anon;
grant execute on function public.vendor_list_listings() to authenticated;

-- A vendor edits their own listing — SAFE columns only. status/verification/owner
-- verification fields are intentionally NOT writable here (moderation stays admin).
create or replace function public.vendor_update_listing(p_id text, p jsonb)
returns setof public.venues
language plpgsql security definer set search_path = public as $$
begin
  update public.venues v set
    name           = coalesce(p->>'name', v.name),
    description    = coalesce(p->>'description', v.description),
    area           = coalesce(p->>'area', v.area),
    city           = coalesce(p->>'city', v.city),
    governorate_id = coalesce(p->>'governorate_id', v.governorate_id),
    city_id        = coalesce(p->>'city_id', v.city_id),
    price_min      = coalesce((p->>'price_min')::numeric, v.price_min),
    price_max      = coalesce((p->>'price_max')::numeric, v.price_max),
    attributes     = coalesce(p->'attributes', v.attributes),
    images         = coalesce((select array_agg(value) from jsonb_array_elements_text(p->'images')), v.images)
  where v.id = p_id and v.claimed_by_user_id = auth.uid();

  return query select * from public.venues where id = p_id and claimed_by_user_id = auth.uid();
end; $$;
revoke execute on function public.vendor_update_listing(text, jsonb) from public, anon;
grant execute on function public.vendor_update_listing(text, jsonb) to authenticated;

-- The inquiries (leads) that belong to a vendor's listings. Matches the same
-- ownership rule as vendor_list_listings (claimed_by_user_id OR owner_email =
-- the caller's own verified email) so leads show even before the back-fill runs.
create or replace function public.vendor_list_leads()
returns setof public.leads
language sql security definer set search_path = public stable as $$
  select l.* from public.leads l
  join public.venues v on v.id = l."venueId"
  where v.claimed_by_user_id = auth.uid()
     or (
       v.owner_email is not null
       and lower(trim(v.owner_email)) = lower((select trim(email) from auth.users where id = auth.uid()))
     )
  order by l."createdAt" desc;
$$;
revoke execute on function public.vendor_list_leads() from public, anon;
grant execute on function public.vendor_list_leads() to authenticated;
