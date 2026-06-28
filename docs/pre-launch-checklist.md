# Sarayah — سرايا · Pre-Launch Checklist

Operational setup for launching the MVP. Nothing here is required for the app to
*run* — every integration is optional and degrades gracefully — but these make it
production-ready. **Never commit `.env.local`; never put real keys in `.env.example`.**

---

## 1. Environment variables

| Variable | Required? | Where | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | local + Vercel | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | local + Vercel | Public anon/publishable key (RLS-bound) |
| `ADMIN_EMAILS` | **Yes** | local + Vercel | Comma-separated admin emails (also add to the `admins` table) |
| `NEXT_PUBLIC_SITE_URL` | recommended | Vercel | Correct absolute links for SEO/Open Graph |
| `RESEND_API_KEY` | optional | local + Vercel | Enables email notifications |
| `ADMIN_NOTIFICATION_EMAIL` | optional | local + Vercel | Where admin alerts are sent |
| `LEAD_NOTIFY_FROM` | optional | local + Vercel | Verified Resend sender (default `Sarayah <onboarding@resend.dev>`) |
| `UPSTASH_REDIS_REST_URL` | optional | local + Vercel | Enables rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | optional | local + Vercel | Enables rate limiting |
| `ANTHROPIC_API_KEY` | optional | local + Vercel | Smarter AI search (falls back to keyword parser) |
| `N8N_WEBHOOK_URL` / `N8N_WEBHOOK_SECRET` / `WHATSAPP_*` | optional — **post-launch, leave blank for MVP** | local + Vercel | n8n automation. Disabled when blank; app runs normally without it. See `n8n-supabase-to-sheets.md` / `n8n-whatsapp-outreach.md` |
| ~~`SUPABASE_SERVICE_ROLE_KEY`~~ | **No — remove** | — | Not used anywhere; see §4 |

> **n8n is NOT part of launch.** Do not set any `N8N_*` / `WHATSAPP_*` variable for
> the MVP. The app is fully functional without n8n; automation is an optional
> post-launch add-on. Google Sheets stays a **manual** CSV/outreach workflow only
> (see `google-sheets-outreach.md`) — it is never connected live to the app.

> On **Vercel**: Project → Settings → Environment Variables. Add the same keys you
> use locally. `NEXT_PUBLIC_*` are exposed to the browser by design; all others are
> server-only and never reach the client bundle.

---

## 2. Resend email setup (optional)

The app sends 4 emails, all graceful no-ops without `RESEND_API_KEY`:
- **Admin** alert on every new lead and every new pending venue.
- **Couple** confirmation after submitting an inquiry (if they gave an email).
- **Venue owner** confirmation after submitting a venue (if they gave an email).

Setup:
1. Create an account at <https://resend.com>.
2. **API Keys → Create** → copy into `RESEND_API_KEY`.
3. Set `ADMIN_NOTIFICATION_EMAIL` to where you want alerts.
4. (Recommended) Verify your domain in Resend and set `LEAD_NOTIFY_FROM` to an
   address on it, e.g. `Sarayah <hello@sarayah.app>`. Until then the shared
   `onboarding@resend.dev` sender works for testing.

Without these: leads and venues still save; the server logs that email is disabled.

---

## 3. Upstash rate limiting (optional but recommended for public launch)

Protects public POST routes from spam/abuse. Disabled (allow-all) if the env vars
are missing; also **fails open** if Redis is unreachable, so it never blocks real users.

| Route | Limit |
|---|---|
| `POST /api/leads` | 5 / IP / 10 min |
| `POST /api/venues` | 3 / IP / 30 min |
| `POST /api/venues/[id]/report` | 5 / IP / 10 min |
| `POST /api/outreach/register-click` | 30 / IP / 10 min |

Setup:
1. Create a free database at <https://upstash.com> → Redis.
2. Copy **REST URL** → `UPSTASH_REDIS_REST_URL` and **REST Token** → `UPSTASH_REDIS_REST_TOKEN`.
3. Deploy. Over-limit requests get a clear `429`.

Admin routes are not rate-limited here (they're behind auth).

---

## 4. Supabase service-role key decision

**You can remove `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`.**

- The app uses **no service-role key**. Public pages use the anon key (RLS-bound);
  admin actions run as the logged-in admin's JWT and are authorized by RLS
  `is_admin()` + the `ADMIN_EMAILS` allowlist.
- The value currently in `.env.local` is actually a **publishable** key
  (`sb_publishable_…`), mislabeled and unused.
- The seed/import scripts also use the **anon** key now, not the service role.

**Action:** delete the `SUPABASE_SERVICE_ROLE_KEY` line from `.env.local`. No
rotation is strictly required (it's a non-secret publishable key), but since it has
been pasted around, rotating your anon/publishable key in Supabase is good hygiene.

---

## 5. Real venue data import

Two scripts (both use the anon key; both insert as `pending_review` + `unverified`
so nothing goes public without admin approval):

- `scripts/seed.mjs` — loads the **DEMO** venues from `src/data/venues_seed.json`.
  These are clearly marked `source: demo_seed` and stay pending until approved.
  Use only for local/dev. **Do not present demo venues as real.**
- `scripts/import-venues.mjs` — imports **real** venues from a CSV.

### Collecting real venues
For each venue, gather: name, type, city/area, address, Google Maps link, official
website/social link, phone/WhatsApp, capacity, indoor/outdoor, amenities, starting
price (if known), and image URLs. Only list venues you have permission to list, or
that you will verify.

### Importing
1. Copy the template: `scripts/venues-template.csv` → e.g. `scripts/venues.csv`.
2. Fill one row per venue. Multi-value fields (`suitableFor`, `images`) use `|`:
   e.g. `Wedding|Engagement`. Booleans are `true`/`false`.
3. Run: `node scripts/import-venues.mjs scripts/venues.csv`
4. Go to **/admin → Venues → pending review** to approve (and verify, with proof)
   each one. Only approved/verified venues appear publicly.

> Don't claim "150+ venues" anywhere unless that many real, approved venues exist.
> The homepage copy is intentionally marketing-safe ("Handpicked", "Cairo · Giza").

---

## 6. Final launch steps

- [ ] Set required env vars locally **and** on Vercel.
- [ ] Remove `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`.
- [ ] (Optional) Add `RESEND_API_KEY` + `ADMIN_NOTIFICATION_EMAIL`.
- [ ] (Optional) Add Upstash keys for rate limiting.
- [ ] Confirm each admin email is in both `ADMIN_EMAILS` and the `admins` table.
- [ ] Import real venues; approve them in `/admin`.
- [ ] Verify `npm run build` and `npm run lint` pass.
- [ ] Smoke test: submit an inquiry, submit a venue, approve it, confirm it shows publicly.
