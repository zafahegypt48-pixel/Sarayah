# Sarayah — سرايا · n8n + WhatsApp Outreach & Venue Verification

> **STATUS: OPTIONAL / POST-LAUNCH — NOT enabled, NOT required to deploy.**
> The MVP ships **without** n8n or WhatsApp automation. Leave all `N8N_*` /
> `WHATSAPP_*` env vars blank and none of this runs. Revisit only if you choose to
> add automation after launch.

A **semi-automated** outreach system: you manually add venue contacts to a Google
Sheet and **approve** each one, then n8n sends a WhatsApp Business template
inviting them to list on Sarayah. This is **not** bulk spam — every contact is
approved by you, opt-outs are respected, and rate limits apply.

> **Golden rules**
> - Use the **WhatsApp Business Cloud API**, never personal WhatsApp.
> - Only message numbers **you manually add and set to `approved_to_contact`**.
> - Never message `do_not_contact` / `not_interested` / `registered` rows.
> - Respect opt-out words (STOP / بلاش / متبعتش) immediately and permanently.
> - Never log or expose API tokens.
> - No venue goes public, and no “Verified by Sarayah” badge appears, without admin action.

---

## 1. Architecture

```
You (manual)                 n8n (orchestration)              WhatsApp Cloud API
─────────────                ───────────────────              ──────────────────
Add rows to Google Sheet ──► Scheduled "send" workflow ─────► Send template message
Set status =                 - filter approved_to_contact
  approved_to_contact        - dedupe, validate, rate-limit
                             - update Sheet → contacted

Venue replies ─────────────► Webhook "reply" workflow ──────► Classify reply (rules)
                             - update Sheet (status, reply)    send link / answer / opt-out

Prospect opens link ───────► Sarayah /add-venue?prospect_id=..  ─► POST /api/outreach/register-click
Prospect submits venue ────► Sarayah POST /api/venues ──────────► saved as pending_review
                             n8n POST /api/outreach/prospect-status (mark registered)
Admin reviews ─────────────► Sarayah /admin → approve / verify ─► venue goes public
```

- **Google Sheet = source of truth** for the outreach pipeline.
- **n8n** holds all WhatsApp credentials and runs the workflows. The Sarayah app
  never sends WhatsApp messages itself.
- **Sarayah app** exposes a few thin, secret-protected routes so n8n can correlate
  registrations, plus the public registration form and admin moderation.
- **Supabase `outreach_prospects`** is only a tracking mirror (clicks /
  registration), not a second source of truth.

---

## 2. Google Sheet schema

One row per venue prospect. Columns:

| Column | Meaning |
|---|---|
| `id` | Your internal prospect id (also used as `prospect_id` in links) |
| `venue_name` | Venue name |
| `type` | Hotel / Hall / Garden / Villa / Rooftop / Restaurant |
| `city` | City |
| `whatsapp_number` | E.164 format, e.g. `+201001234567` |
| `phone` | Optional secondary phone |
| `source_url` | Where you found the public contact (manual note) |
| `contact_person` | Name/role if known |
| `status` | See allowed statuses below |
| `last_message_sent` | ISO timestamp of last outbound message |
| `last_reply` | Raw text of last reply |
| `reply_category` | interested / pricing_question / needs_more_info / not_interested / opt_out / unclear |
| `next_action` | wait_for_reply / waiting_for_registration / no_more_auto_messages / pending_admin_review |
| `registered` | TRUE/FALSE |
| `registration_link` | Unique link sent to this prospect |
| `notes` | Free notes / error messages |
| `created_at`, `updated_at` | Timestamps |

### Allowed statuses
`new`, `approved_to_contact`, `contacted`, `interested`, `needs_more_info`,
`pricing_question`, `not_interested`, `do_not_contact`, `follow_up`,
`registered`, `failed`, `duplicate`, `manual_review`

### Status the "send" workflow may act on
**Only `approved_to_contact`.** n8n must **never** send to:
`new`, `do_not_contact`, `not_interested`, `registered`, `failed`, `duplicate`, `manual_review`.

---

## 3. WhatsApp setup (one-time)

1. Create a **Meta Business** account and a **WhatsApp Business App**.
2. Add a phone number, get: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, a permanent `WHATSAPP_ACCESS_TOKEN`.
3. Create and submit **message templates** for approval (see §5). Business-initiated
   messages outside the 24-hour window **must** use an approved template.
4. Store all credentials **in n8n credentials**, not in the Sheet or the app.

---

## 4. Workflow A — Send first outreach (scheduled, manual-approved)

Trigger: schedule (e.g. every hour during working hours) **or** manual run.

Steps:
1. **Read Sheet** rows where `status = approved_to_contact`.
2. **Rate limit / batch**: take only `BATCH_SIZE` rows per run (start 10–20). Add a
   delay (e.g. 3–10s) between sends.
3. For each row:
   - **Validate** `whatsapp_number` (E.164, digits, length). Invalid → set `notes`, skip.
   - **Dedupe** (§ below): if the same number already exists with status
     `contacted/interested/registered/do_not_contact`, mark this row `duplicate`, skip.
   - **Send** the approved WhatsApp **template** message.
   - On **success**: update row → `status = contacted`, `last_message_sent = now`,
     `next_action = wait_for_reply`.
   - On **failure**: update row → `status = failed`, append safe error to `notes`
     (no tokens). Do **not** mark contacted. Retry later by setting back to
     `approved_to_contact`.

### Duplicate protection
Before sending, look up `whatsapp_number` across the whole sheet. If it already
appears with `contacted / interested / registered / do_not_contact`, do not send;
set the new row to `duplicate` (or add a note).

### First message (meaning — must map to an approved template)
> Hello, we’re launching **Sarayah — سرايا**, a wedding and event venue finder for Egypt.
> We’re inviting selected hotels, halls, gardens, and event venues to list **for free during launch** so couples and event planners can discover them and send booking inquiries.
> Would you like us to send you the free registration link?
> Reply **YES** if interested, or **STOP** to not receive messages.

---

## 5. WhatsApp templates (submit for approval)

Use template variables (`{{1}}`) where needed. Suggested templates:

**`sarayah_intro` (MARKETING/UTILITY, en + ar):**
```
Hello! We're launching Sarayah — سرايا, a wedding & event venue finder for Egypt.
We're inviting venues like yours to list FREE during launch and receive booking
inquiries from couples and event planners.
Reply YES to get your free registration link, or STOP to opt out.
```

**`sarayah_registration_link` (UTILITY):**
```
Great! Here is your free registration link: {{1}}
Listing is free during launch. Reply STOP anytime to opt out.
```

**`sarayah_followup` (UTILITY, sent once after 3 days):**
```
Just following up from Sarayah — سرايا. Free venue listing during launch is still
open. Reply YES for your registration link, or STOP to opt out.
```

Quick replies inside a normal session window (within 24h of a user message) can be
free-form; business-initiated messages need an approved template.

---

## 6. Workflow B — Receive reply (webhook)

Trigger: WhatsApp inbound message (via Meta webhook → n8n, or via the app's
`/api/outreach/webhook` forwarding).

Steps:
1. **Verify** the webhook (Meta `hub.verify_token`, and the `N8N_WEBHOOK_SECRET`
   on any app↔n8n hops).
2. **Match** sender number → Sheet row.
3. Save `last_reply` + reply timestamp.
4. **Classify** the reply using rules first (see scenarios). Only fall back to
   `manual_review` if nothing matches.

### Reply classification (rules)

| Category | If reply contains (en / ar) | Set status | Action |
|---|---|---|---|
| **interested** | yes, interested, ok / تمام، مهتم، ابعت، ابعتلي، سجل، عايز أعرف | `interested` | send registration link; `next_action = waiting_for_registration` |
| **pricing_question** | price, cost, fees, subscription / بكام، كام، السعر، الاشتراك، المصاريف | `pricing_question` | reply "free during launch" + send link; `next_action = waiting_for_registration` |
| **needs_more_info** | details, who are you, what is this / مين أنتم، تفاصيل، إيه ده، الموقع ده إيه، بتعملوا إيه | `needs_more_info` | send short Sarayah explanation + benefits |
| **not_interested** | no, not interested / لا، مش مهتم، مش محتاجين، بعدين | `not_interested` | polite closing; **no auto follow-up** |
| **opt_out** | stop, unsubscribe, remove / بلاش، متبعتش، امسح الرقم، مش عايز رسائل | `do_not_contact` | send ONE confirmation; never message again |
| **unclear** | anything else | `manual_review` | save reply; notify admin; do not auto-reply more than once |

**Benefits message (needs_more_info):** free listing during launch, more
visibility, booking inquiries from couples/planners, no commission during launch
(unless we decide otherwise later).

**Opt-out confirmation (send once):**
> تمام، لن نرسل لك أي رسائل أخرى. شكرًا لك.

---

## 7. Workflow C — Follow-up (daily, once only)

Trigger: daily schedule.

Steps:
1. Find rows where `status = contacted` AND no reply AND `last_message_sent` older
   than **3 days** AND no follow-up already sent.
2. Send **one** follow-up template (`sarayah_followup`).
3. Update → `status = follow_up`, `next_action = no_more_auto_messages`.

Never send more than one automated follow-up.

---

## 8. Registration & verification connection

When a prospect registers via their link `/add-venue?source=whatsapp&prospect_id=<id>`:

1. The page pings `POST /api/outreach/register-click` (click tracking).
2. On submit, the app `POST /api/venues` saves the venue as
   **`status = pending_review`, `verification_status = unverified`,
   `source = whatsapp_outreach`, `prospect_id = <id>`** — it is **not public**.
3. n8n (or the app) calls `POST /api/outreach/prospect-status` to set the Sheet/
   mirror → `status = registered`, `registered = true`,
   `next_action = pending_admin_review`. Match by `prospect_id` (preferred), else
   `whatsapp_number` / `phone`.
4. **Admin reviews** in `/admin` → Venues → Pending, then Approve (and optionally
   Verify after checking ownership). Only then does it appear publicly.

---

## 9. Venue moderation & verification (in the Sarayah app)

This is built into the app (not n8n):

- **Every** `/add-venue` submission is saved `pending_review` + `unverified` +
  `unclaimed`. The server **forces** these — a submitter can never self-approve or
  self-verify.
- Public `/venues`, the home page, and venue detail show **only** venues with
  `status in (approved, verified)` — enforced by Supabase RLS, not just UI.
- Admin sees all venues (incl. pending/rejected/suspended) via their session.

**Venue statuses:** `pending_review`, `approved`, `rejected`, `suspended`, `verified`
**Verification statuses:** `unverified`, `claim_pending`, `claimed`, `verified`, `rejected`

**Proof fields** (collected on `/add-venue`, shown to admin only): `owner_name`,
`owner_role`, `owner_email`, `owner_phone`, `official_website`, `google_maps_link`,
`social_link`, plus admin-set `verification_method`, `verification_notes`,
`verified_at`, `verified_by_admin`, `claim_status`, `claimed_by_user_id`.

### Strong verification for high-risk venues
For famous hotels / large venues (JW Marriott, Hilton, Four Seasons, big halls),
require **stronger** proof before marking Verified:
1. Official **business-domain email** (e.g. `name@hotel-domain.com`).
2. **Callback to the official public number** from the hotel website / Google
   Maps — not the number the submitter typed.
3. Official website / verified social proof.
4. Business card or authorization document (kept private — never shown publicly).
5. Manual admin review.

> Never mark a venue Verified just because the submitted name/address/phone look
> correct. Correct public info is **not** proof of ownership.

### Claim flow
A would-be owner can request to claim an existing listing. Save
`claim_status = claim_pending`, ask for proof, admin approves/rejects. Claiming ≠
verification.

### Public labels
- **“Verified by Sarayah”** — only when `verification_status = verified` (admin-set).
- **“Unverified listing”** — approved but not verified.
- **“Report this listing”** — on every venue detail page.

---

## 10. Scam prevention

- **Report button** on venue detail → `POST /api/venues/{id}/report` → admin
  Reports tab. Admin can **Suspend** the venue from the Venues tab.
- **Audit log** (`venue_audit`): approvals, rejections, verifications, deletes.
- Submitted **owner documents/contact stay private** — never displayed publicly.
- **No payments** are collected through Sarayah in this MVP.
- **Disclaimer** shown on venue detail (EN + AR): users confirm availability,
  prices, contracts, and payment directly with the venue before paying.

---

## 11. App API routes (for n8n)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/outreach/health` | GET | `x-n8n-secret` | Check config (booleans only, no secrets) |
| `/api/outreach/webhook` | POST | `x-n8n-secret` | Receive n8n/WhatsApp events; mirror prospect |
| `/api/outreach/webhook` | GET | `hub.verify_token` | WhatsApp webhook verification handshake |
| `/api/outreach/prospect-status` | POST | `x-n8n-secret` | n8n updates prospect status/registration |
| `/api/outreach/register-click` | POST | none (browser) | Track link opens (low-sensitivity ping) |

n8n must send the secret as header `x-n8n-secret: <N8N_WEBHOOK_SECRET>` (or
`Authorization: Bearer <secret>`). `register-click` is browser-called so it is
intentionally not secret-gated (it only writes a click marker; stores no PII and
returns nothing readable).

---

## 12. Rate limiting & logging

- **Batch size** configurable in n8n (`BATCH_SIZE`, start 10–20/run).
- **Delay** between messages (3–10s) to avoid bursts.
- Cap daily volume; spread sends across the day.
- **Log**: message sent, message failed, reply received, status changed, link
  sent, opt-out received. **Never log API tokens/secrets.**

---

## 13. Manual setup checklist

- [ ] Create Google Sheet with the schema in §2.
- [ ] Set up WhatsApp Business Cloud API; submit templates (§5).
- [ ] Put all WhatsApp creds in **n8n credentials**.
- [ ] Set `N8N_WEBHOOK_SECRET` in both n8n and the app's `.env.local`.
- [ ] Set `NEXT_PUBLIC_SITE_URL` so registration links are absolute.
- [ ] Build the 3 workflows (send / reply / follow-up).
- [ ] Test with **your own number** first.
- [ ] Manually add a few real contacts; set `approved_to_contact` to start.
- [ ] Confirm opt-out (STOP / بلاش) sets `do_not_contact`.
- [ ] Confirm registrations land as `pending_review` and require admin approval.

---

## 14. Environment variables

In `.env.local` (placeholders are in `.env.example`, never commit real values):
```
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=
N8N_WEBHOOK_SECRET=
NEXT_PUBLIC_SITE_URL=
```
WhatsApp tokens are **server-only** — never reference them in client components.

---

## 15. Test cases

**Outreach**
- [ ] `approved_to_contact` row sends; `new` row does not.
- [ ] Invalid number skipped; duplicate number skipped.
- [ ] STOP / بلاش → `do_not_contact`, one confirmation, never messaged again.
- [ ] "interested" reply → registration link sent.
- [ ] Price question → free-launch answer + link.
- [ ] No reply after 3 days → exactly one follow-up.
- [ ] Registered venue → Sheet `registered`, app `pending_review`.
- [ ] Webhook with wrong secret → 401.
- [ ] No tokens in frontend or logs.

**Venue safety**
- [ ] New submission saved `pending_review`; not on public `/venues`.
- [ ] Admin approve → appears publicly; reject → stays hidden.
- [ ] Admin verify → “Verified by Sarayah” badge; unverify removes it.
- [ ] A user cannot self-verify (server forces `unverified` on submit).
- [ ] Claim stays `claim_pending` until admin review.
- [ ] Famous-hotel submissions require stronger verification (process, §9).
- [ ] Report listing works; suspended venues disappear from public pages.
