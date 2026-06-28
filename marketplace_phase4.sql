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
create or replace function public.vendor_list_listings()
returns setof public.venues
language sql security definer set search_path = public stable as $$
  select * from public.venues
  where claimed_by_user_id = auth.uid()
  order by created_at desc;
$$;
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

-- The inquiries (leads) that belong to a vendor's listings.
create or replace function public.vendor_list_leads()
returns setof public.leads
language sql security definer set search_path = public stable as $$
  select l.* from public.leads l
  join public.venues v on v.id = l."venueId"
  where v.claimed_by_user_id = auth.uid()
  order by l."createdAt" desc;
$$;
revoke execute on function public.vendor_list_leads() from public, anon;
grant execute on function public.vendor_list_leads() to authenticated;
