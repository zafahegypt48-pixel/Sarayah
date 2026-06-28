-- ===========================================================================
-- Zafah — الزفة · Complete Supabase schema + security (single source of truth)
-- ===========================================================================
-- Run on a FRESH Supabase project: SQL Editor -> New query -> paste -> Run.
-- This recreates the full current state: tables, columns, functions, RLS,
-- column-level grants, admin RPCs, and storage buckets. It is the authoritative
-- file to reproduce the database if you reset, redeploy, or move the project.
-- (The live project also has an equivalent migration history under the same
--  names listed in docs/database-security.md.)
--
-- SECURITY MODEL (see docs/database-security.md for the full explanation)
-- ----------------------------------------------------------------------
-- * No service-role/secret key is used by the app. Public uses the anon key;
--   admins act server-side as their own logged-in JWT.
-- * RLS limits ROWS; column-level GRANTs limit COLUMNS. Because the anon key is
--   public, BOTH `anon` and `authenticated` are restricted to PUBLIC-SAFE venue
--   columns only. Private venue columns (owner_*, admin_notes, verification_*,
--   contact_status, etc.) are NOT directly selectable by any API role.
-- * Admins read FULL venue data only via SECURITY DEFINER RPCs gated by is_admin().
-- * NEVER use select("*") on a public API path — use the public column whitelist.

-- ---------------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------------
-- Venues. id uses a UUID-based default (epoch-second ids collided on same-second
-- submissions). Public-safe columns are commented; the rest are admin-only.
create table if not exists venues (
  id text primary key default ('v' || replace(gen_random_uuid()::text, '-', '')),
  -- public-safe columns:
  name text not null,
  type text not null,
  city text not null,
  area text,
  "indoorOutdoor" text,
  "capacityMin" integer default 0,
  "capacityMax" integer default 0,
  "startingPrice" numeric default 0,
  halls integer default 1,
  "venueSize" numeric default 0,
  catering boolean default false,
  parking boolean default false,
  "bridalRoom" boolean default false,
  dj boolean default false,
  decoration boolean default false,
  "kidsArea" boolean default false,
  ac boolean default false,
  valet boolean default false,
  "suitableFor" text[] default '{}',
  rating numeric default 0,
  reviews integer default 0,
  description text,
  images text[] default '{}',
  status text default 'pending_review',           -- pending_review|approved|rejected|suspended|verified
  verification_status text default 'unverified',  -- unverified|claim_pending|claimed|verified|rejected
  verified_at timestamptz,
  created_at timestamptz default now(),
  -- admin/private columns (never exposed to public/non-admin):
  claim_status text default 'unclaimed',
  source text default 'public',
  prospect_id text,
  owner_name text,
  owner_role text,
  owner_email text,
  owner_phone text,
  owner_whatsapp text,
  official_website text,
  google_maps_link text,
  social_link text,
  verification_method text,
  verification_notes text,
  verified_by_admin text,
  claimed_by_user_id uuid,
  contact_status text default 'not_contacted',
  last_contacted_at timestamptz,
  admin_notes text,
  authorization_confirmed boolean default false,
  verification_docs text[] default '{}',
  updated_at timestamptz default now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  suspended_at timestamptz
);
create index if not exists venues_status_idx on venues(status);
-- Indexes supporting the public filtered listing (searchVenues): partial on the
-- publicly visible rows, plus a GIN index for the suitableFor array `contains`.
create index if not exists venues_city_idx          on venues(city)          where status in ('approved','verified');
create index if not exists venues_type_idx          on venues(type)          where status in ('approved','verified');
create index if not exists venues_capacitymax_idx   on venues("capacityMax") where status in ('approved','verified');
create index if not exists venues_startingprice_idx on venues("startingPrice") where status in ('approved','verified');
create index if not exists venues_created_at_idx     on venues(created_at desc);
create index if not exists venues_suitablefor_idx    on venues using gin ("suitableFor");

create table if not exists leads (
  id text primary key default ('l' || replace(gen_random_uuid()::text, '-', '')),
  "venueId" text references venues(id) on delete set null,
  "venueName" text,
  name text not null,
  phone text not null,
  email text,
  "eventDate" date,
  "eventType" text,
  guests integer,
  budget numeric,
  notes text,
  status text default 'new',
  status_updated_at timestamptz,
  "createdAt" timestamptz default now()
);
-- Covering index for the venueId foreign key (admin lead lookups by venue).
create index if not exists leads_venueid_idx on leads("venueId");

-- Admins identified by email (matches the auth JWT email claim). Keep in sync
-- with ADMIN_EMAILS in the app env. Locked down: no RLS policies => no API access.
create table if not exists admins (
  email text primary key,
  created_at timestamptz default now()
);

create table if not exists contact_messages (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  phone text,
  inquiry_type text,
  message text not null,
  created_at timestamptz default now()
);

create table if not exists venue_reports (
  id bigint generated always as identity primary key,
  venue_id text references venues(id) on delete set null,
  reason text,
  details text,
  reporter_contact text,
  status text default 'open',
  created_at timestamptz default now()
);
-- Covering index for the venue_id foreign key (admin report triage by venue).
create index if not exists venue_reports_venue_idx on venue_reports(venue_id);

create table if not exists venue_audit (
  id bigint generated always as identity primary key,
  venue_id text,
  action text not null,
  actor_email text,
  details jsonb,
  created_at timestamptz default now()
);

-- Lightweight tracking mirror for WhatsApp outreach (Google Sheet is the source
-- of truth). Written by N8N_WEBHOOK_SECRET-gated routes; admin-read only.
create table if not exists outreach_prospects (
  prospect_id text primary key,
  whatsapp_number text,
  status text,
  registered boolean default false,
  venue_id text,
  clicks integer default 0,
  last_event text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed your admin email(s). Replace with your real admin address before launch.
insert into admins (email) values ('karimdeheya22@gmail.com') on conflict (email) do nothing;

-- ---------------------------------------------------------------------------
-- 2. FUNCTIONS
-- ---------------------------------------------------------------------------
-- True when the current request's JWT email is an admin (security definer so it
-- can read the locked-down admins table).
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.admins where lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  );
$$;

-- Auto-maintain venues.updated_at on every update.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists venues_set_updated_at on venues;
create trigger venues_set_updated_at before update on venues
  for each row execute function public.set_updated_at();

-- Admin-only FULL venue reads. SECURITY DEFINER bypasses the column-level grants
-- below, but only returns rows when the caller is an admin (is_admin reads the
-- caller's JWT). This is how the admin dashboard gets owner/admin columns.
create or replace function public.admin_list_venues()
returns setof public.venues
language sql security definer set search_path = public stable as $$
  select * from public.venues where public.is_admin() order by created_at desc;
$$;

create or replace function public.admin_get_venue(p_id text)
returns setof public.venues
language sql security definer set search_path = public stable as $$
  select * from public.venues where id = p_id and public.is_admin();
$$;

revoke execute on function public.admin_list_venues() from public, anon;
revoke execute on function public.admin_get_venue(text) from public, anon;
grant execute on function public.admin_list_venues() to authenticated;
grant execute on function public.admin_get_venue(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table venues             enable row level security;
alter table leads              enable row level security;
alter table admins             enable row level security;  -- no policies => locked
alter table contact_messages   enable row level security;
alter table venue_reports      enable row level security;
alter table venue_audit        enable row level security;
alter table outreach_prospects enable row level security;

-- VENUES: public reads only approved/verified rows; admins read all (RPC adds full
-- columns). Public may submit; only admins update/delete.
drop policy if exists "venues_public_read"   on venues;
drop policy if exists "venues_admin_read"    on venues;
drop policy if exists "venues_public_insert" on venues;
drop policy if exists "venues_admin_update"  on venues;
drop policy if exists "venues_admin_delete"  on venues;
create policy "venues_public_read"   on venues for select using (status in ('approved','verified'));
create policy "venues_admin_read"    on venues for select to authenticated using (is_admin());
create policy "venues_public_insert" on venues for insert with check (true);
create policy "venues_admin_update"  on venues for update to authenticated using (is_admin()) with check (is_admin());
create policy "venues_admin_delete"  on venues for delete to authenticated using (is_admin());

-- LEADS: public submit only; admin read/update/delete.
drop policy if exists "leads_public_insert" on leads;
drop policy if exists "leads_admin_read"    on leads;
drop policy if exists "leads_admin_update"  on leads;
drop policy if exists "leads_admin_delete"  on leads;
create policy "leads_public_insert" on leads for insert with check (true);
create policy "leads_admin_read"    on leads for select to authenticated using (is_admin());
create policy "leads_admin_update"  on leads for update to authenticated using (is_admin()) with check (is_admin());
create policy "leads_admin_delete"  on leads for delete to authenticated using (is_admin());

-- CONTACT MESSAGES: public submit only; admin read.
drop policy if exists "contact_public_insert" on contact_messages;
drop policy if exists "contact_admin_read"    on contact_messages;
create policy "contact_public_insert" on contact_messages for insert with check (true);
create policy "contact_admin_read"    on contact_messages for select to authenticated using (is_admin());

-- VENUE REPORTS: public submit only; admin read/triage.
drop policy if exists "reports_public_insert" on venue_reports;
drop policy if exists "reports_admin_read"    on venue_reports;
drop policy if exists "reports_admin_update"  on venue_reports;
create policy "reports_public_insert" on venue_reports for insert with check (true);
create policy "reports_admin_read"    on venue_reports for select to authenticated using (is_admin());
create policy "reports_admin_update"  on venue_reports for update to authenticated using (is_admin()) with check (is_admin());

-- VENUE AUDIT: admin only.
drop policy if exists "audit_admin_read"   on venue_audit;
drop policy if exists "audit_admin_insert" on venue_audit;
create policy "audit_admin_read"   on venue_audit for select to authenticated using (is_admin());
create policy "audit_admin_insert" on venue_audit for insert to authenticated with check (is_admin());

-- OUTREACH PROSPECTS: public may INSERT (register a prospect); UPDATE and SELECT
-- are admin-only. UPDATE was locked down from public to admins to avoid a public-
-- writable table. If outreach link-click tracking is re-enabled post-launch, route
-- the increment through a SECURITY DEFINER RPC or the secret-gated server path.
drop policy if exists "prospects_public_insert" on outreach_prospects;
drop policy if exists "prospects_public_update" on outreach_prospects;
drop policy if exists "prospects_admin_update"  on outreach_prospects;
drop policy if exists "prospects_admin_read"    on outreach_prospects;
create policy "prospects_public_insert" on outreach_prospects for insert with check (true);
create policy "prospects_admin_update"  on outreach_prospects for update to authenticated using (is_admin()) with check (is_admin());
create policy "prospects_admin_read"    on outreach_prospects for select to authenticated using (is_admin());

-- ---------------------------------------------------------------------------
-- 4. COLUMN-LEVEL GRANTS (the key privacy control)
-- ---------------------------------------------------------------------------
-- RLS filters rows, not columns. The anon key is public, so restrict BOTH anon
-- and authenticated to PUBLIC-SAFE venue columns. Private columns are unreadable
-- by these roles directly; admins get them only via the RPCs above.
revoke select on public.venues from anon;
revoke select on public.venues from authenticated;
grant select (
  id, name, type, city, area, "indoorOutdoor", "capacityMin", "capacityMax",
  "startingPrice", halls, "venueSize", catering, parking, "bridalRoom", dj,
  decoration, "kidsArea", ac, valet, "suitableFor", rating, reviews, description,
  images, status, verification_status, verified_at, created_at
) on public.venues to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. STORAGE BUCKETS
-- ---------------------------------------------------------------------------
-- venue-images: PUBLIC (venue photos shown on the site). Public INSERT is allowed
-- (free listing flow), so cap size and restrict to safe raster image types (NO svg
-- — it can carry script). 5MB limit.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('venue-images', 'venue-images', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
  set public = true, file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

-- venue-docs: PRIVATE verification/proof documents. 5MB, images + PDF only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('venue-docs', 'venue-docs', false, 5242880,
        array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf'];

-- Storage policies.
drop policy if exists "Public read venue images"   on storage.objects;
drop policy if exists "Public upload venue images" on storage.objects;
drop policy if exists "venue_docs_admin_read"      on storage.objects;
drop policy if exists "venue_docs_public_insert"   on storage.objects;
drop policy if exists "venue_docs_admin_delete"    on storage.objects;

-- venue-images: public UPLOAD (free listing flow). No broad SELECT policy — the
-- bucket is public, so object URLs (/object/public/...) work without one, while
-- omitting it prevents clients from LISTING/enumerating all files (incl. images of
-- pending/rejected venues).
create policy "Public upload venue images" on storage.objects for insert with check (bucket_id = 'venue-images');

-- venue-docs: PRIVATE. Public may UPLOAD proof; only admins may READ (via signed
-- URLs) or DELETE. Public can never list/download proof documents.
create policy "venue_docs_public_insert" on storage.objects for insert with check (bucket_id = 'venue-docs');
create policy "venue_docs_admin_read"    on storage.objects for select to authenticated using (bucket_id = 'venue-docs' and is_admin());
create policy "venue_docs_admin_delete"  on storage.objects for delete to authenticated using (bucket_id = 'venue-docs' and is_admin());

-- ---------------------------------------------------------------------------
-- 6. MARKETPLACE (Phase 1) — categories, locations, listing evolution, packages,
--    listing_images, reviews, favorites, profiles.
-- ---------------------------------------------------------------------------
-- The full marketplace DDL lives in `marketplace_phase1.sql` (kept separate so it
-- can be run as an additive migration on the existing DB without re-running the
-- core schema above). For a FRESH recreate: run THIS file first, then run
-- `marketplace_phase1.sql`. It is idempotent and depends on `is_admin()` (defined
-- above), so the order matters: core schema → marketplace_phase1.sql.
