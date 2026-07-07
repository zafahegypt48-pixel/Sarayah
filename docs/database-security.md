# Sarayah — سرايا · Database Security & Privacy

How the database protects private data, and how to reproduce it. The single
source of truth for recreating the DB is **`supabase_schema.sql`** (run it on a
fresh Supabase project). This doc explains *why* it's built the way it is.

---

## 1. Public-safe vs admin-only venue columns

**Public-safe** (readable by anyone — used for browsing/search):
`id, name, type, city, area, indoorOutdoor, capacityMin, capacityMax,
startingPrice, halls, venueSize, catering, parking, bridalRoom, dj, decoration,
kidsArea, ac, valet, suitableFor, rating, reviews, description, images,
verification_status, verified_at, created_at, status`.

**Admin-only / private** (NEVER exposed to public or non-admin users):
`owner_name, owner_email, owner_phone, owner_whatsapp, official_website,
google_maps_link, social_link, admin_notes, verification_notes,
verification_method, verification_docs, contact_status, last_contacted_at,
prospect_id, verified_by_admin, claimed_by_user_id, source, claim_status,
authorization_confirmed, approved_at, rejected_at, suspended_at, updated_at`.

All columns of `leads`, `contact_messages`, `venue_reports`, `venue_audit`,
`outreach_prospects`, and `admins` are private (admin-only or no read at all).

---

## 2. Why column-level permissions were needed

Supabase RLS filters **rows**, not **columns**. The public **anon key is embedded
in the browser bundle**, so anyone can call PostgREST directly:

```
GET https://<project>.supabase.co/rest/v1/venues?select=owner_email,admin_notes
```

Row-level RLS alone would still return those private columns for approved venues.
So we add **column-level GRANTs**: `anon` and `authenticated` are granted `SELECT`
on the public-safe columns only. A direct query for a private column now returns
`permission denied`. (App-layer whitelists are kept too, as defense in depth.)

> Both `anon` AND `authenticated` are restricted — a logged-in non-admin (e.g. a
> couple with an account) must not see private columns either. Admins share the
> `authenticated` role, so they're column-restricted on direct table access too;
> they read full data through the RPCs below instead.

---

## 3. Never use `select("*")` on a public API path

Public/anon code must select the explicit public-column whitelist
(`PUBLIC_VENUE_COLUMNS` in `src/lib/data.js`). `select("*")` would request private
columns and fail (or, before the grants, leak them). Admin reads use the RPCs.

---

## 4. Admin RPCs (full venue data)

Two `SECURITY DEFINER` functions return full venue rows, **gated by `is_admin()`**:

| RPC | Returns |
|---|---|
| `admin_list_venues()` | all venues (full columns) — when caller is admin |
| `admin_get_venue(p_id text)` | one venue (full columns) — when caller is admin |

- `SECURITY DEFINER` lets them bypass the column grants, but the `where is_admin()`
  clause means a non-admin caller gets **zero rows**. `EXECUTE` is granted to
  `authenticated` only (revoked from `anon`/`public`).
- `is_admin()` reads the caller's JWT email and checks the `admins` table.
- The app uses these via `getVenues(client, {all:true})` and
  `getVenueById(id, client, {all:true})`. `updateVenue`/`deleteVenue` read back
  only `id` to confirm the write, then fetch the full row via `admin_get_venue`.

---

## 5. RLS policy summary

| Table | anon/public | authenticated non-admin | admin |
|---|---|---|---|
| `venues` | read approved/verified (public cols) · insert | same as anon | read all (via RPC) · update · delete |
| `leads` | insert only | insert only | read · update · delete |
| `contact_messages` | insert only | insert only | read |
| `venue_reports` | insert only | insert only | read · update |
| `venue_audit` | — | — | read · insert |
| `outreach_prospects` | insert · update (secret-gated routes) | same | read |
| `admins` | — (no policies; locked) | — | read only via `is_admin()` (definer) |

Public users **cannot** read any private table, **cannot** update/delete venues,
and **cannot** see pending/rejected/suspended venues (only `approved`/`verified`).

---

## 6. Storage buckets

| Bucket | Public? | Limits | Policies |
|---|---|---|---|
| `venue-images` | **public** | 10 MB, image/jpeg·png·webp·gif | public read + public upload (venue photos) |
| `venue-docs` | **private** | 20 MB, image/jpeg·png·webp + pdf | public **insert**; **admin-only** read & delete |

- Public users **cannot list or download** `venue-docs`. Admins view proof
  documents only via **short-lived signed URLs** generated from an admin session.
- Private document paths are stored in `venues.verification_docs` (admin-only column).

---

## 7. How to reapply / recreate the database

**Fresh project (reset / move / redeploy):**
1. Create the Supabase project.
2. SQL Editor → paste all of `supabase_schema.sql` → Run. This recreates every
   table, column, function, RLS policy, column grant, RPC, and storage bucket.
3. Update the seeded admin email in the script (or `insert into admins(email)`),
   and keep it in sync with `ADMIN_EMAILS`.
4. (Optional) seed/import venues with `node scripts/seed.mjs` or
   `node scripts/import-venues.mjs` (see `pre-launch-checklist.md`).

**Live migration history** (already applied to the current project, in order):
`create_venue_images_storage`, `add_email_to_leads`, `secure_rls_admin_policies`,
`venue_moderation_columns`, `outreach_and_safety_tables`, `venues_public_read_filter`,
`venue_contact_tracking_and_docs`, `contact_messages_table`,
`venue_proof_upload_and_authorization`, `venue_docs_admin_delete_policy`,
`venue_lead_timestamps`, `fix_id_default_collisions`, `venues_anon_column_grants`,
`venues_authenticated_column_grants_and_admin_rpc`.
`supabase_schema.sql` is the consolidated equivalent of all of these.

---

## 8. Before deploying to Vercel

- Set env vars on Vercel (see `pre-launch-checklist.md`): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ADMIN_EMAILS` (required); optional Resend /
  Upstash / Anthropic keys.
- Do **not** set or expose a service-role key — the app doesn't use one.
- Confirm `.env.local` is gitignored and `.env.example` has placeholders only.
- After any DB change, update `supabase_schema.sql` so the repo stays the source of truth.
- Sanity-check: a direct anon/PostgREST `select=owner_email` on `venues` must return
  `permission denied`; admin dashboard must still show full venue data via the RPC.
