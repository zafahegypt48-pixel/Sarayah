# Zafah — الزفة · n8n Mirror: Supabase → Google Sheets (one-way)

> **STATUS: OPTIONAL / POST-LAUNCH — NOT enabled, NOT required to deploy.**
> The MVP ships **without** n8n. This whole workflow is disabled unless you set
> `N8N_WEBHOOK_URL` (leave it blank and the mirror is a silent no-op). Set it up
> later only if you decide you want automation. Until then, manage outreach with
> the **manual** CSV flow in `google-sheets-outreach.md`.

Automatically append a row to a Google Sheet whenever a **new lead** or a **new
pending venue** is created — for outreach tracking. **One-way only.** Google Sheets
is never read by the app; **Supabase remains the source of truth.**

```
Visitor submits form
   → Next.js API route saves to Supabase   (always — source of truth)
   → fire-and-forget POST to n8n webhook    (optional side effect)
        → n8n verifies the secret header
        → n8n appends a row to Google Sheets
```

If n8n is down, missing, or misconfigured, **the app still saves to Supabase
normally** — the mirror is fire-and-forget and a no-op when `N8N_WEBHOOK_URL` is unset.

> This is the **opposite** direction from `docs/n8n-whatsapp-outreach.md` (which is
> n8n → app). Both reuse the same `N8N_WEBHOOK_SECRET`. There is **no** automatic
> Google Sheets → Supabase import — to bring real venues *in*, use the manual CSV
> flow in `docs/google-sheets-outreach.md`.

---

## 1. What the app sends

The app POSTs JSON to `N8N_WEBHOOK_URL` with header `x-webhook-secret:
<N8N_WEBHOOK_SECRET>`. Body shape:

```json
{ "event": "lead.created" | "venue.pending", "data": { ...whitelisted fields... } }
```

**Lead payload (`event: "lead.created"`):**
`lead_id, venue_name, customer_name, phone, email, event_date, guests, budget,
message, status, created_at`

**Venue payload (`event: "venue.pending"`):**
`venue_id, venue_name, city, owner_name, owner_phone, owner_whatsapp, owner_email,
status, verification_status, submitted_at`

**Never sent:** proof documents / `verification_docs` paths, `admin_notes`,
`source`, `prospect_id`, addresses, or any other private/internal column. The
whitelist lives in `src/lib/n8n.js`.

---

## 2. Environment variables

Add to `.env.local` (local) and to **Vercel → Project → Settings → Environment
Variables** (production). Both are optional — omit them and the mirror is disabled.

| Var | Purpose |
|---|---|
| `N8N_WEBHOOK_URL` | Production webhook URL of your n8n workflow (from the Webhook node). |
| `N8N_WEBHOOK_SECRET` | Long random string. The app sends it; n8n must require it. |

Generate a secret (example): `openssl rand -hex 32`. Put the **same** value in the
app env and in the n8n Header Auth credential (next section). Never commit it; never
print it; it stays server-side only (the mirror module is never imported by client code).

---

## 3. Google Sheet structure

Create one spreadsheet with **two tabs**. Row 1 = headers (exact names below).

**Tab `Leads`:**
```
lead_id | venue_name | customer_name | phone | email | event_date | guests | budget | message | status | created_at
```

**Tab `Venues`:**
```
venue_id | venue_name | city | owner_name | owner_phone | owner_whatsapp | owner_email | status | verification_status | submitted_at
```

---

## 4. Configure n8n Cloud

### a) Create the workflow + Webhook node
1. n8n Cloud → **Create Workflow**.
2. Add a **Webhook** node:
   - HTTP Method: **POST**
   - Path: e.g. `zafah-mirror`
   - **Authentication: Header Auth** → create a credential:
     - Name: `x-webhook-secret`
     - Value: the **same** string as `N8N_WEBHOOK_SECRET`
   - This makes n8n reject any request without the correct secret (401) — random
     callers can't append rows.
3. Copy the **Production URL** (e.g. `https://<you>.app.n8n.cloud/webhook/zafah-mirror`)
   → this is your `N8N_WEBHOOK_URL`.

### b) Route by event type
Add a **Switch** node after the webhook, keyed on `{{ $json.body.event }}`:
- Output 1: equals `lead.created`
- Output 2: equals `venue.pending`

### c) Connect Google Sheets (no API keys in the app)
1. From the `lead.created` branch, add a **Google Sheets** node → Operation
   **Append Row**.
2. Credential: **Google Sheets OAuth2** → *Sign in with Google* and authorize.
   (OAuth happens entirely inside n8n; the app never holds Google credentials.)
3. Select your spreadsheet + the **`Leads`** tab.
4. Map columns to the payload, e.g. `lead_id` → `{{ $json.body.data.lead_id }}`,
   `customer_name` → `{{ $json.body.data.customer_name }}`, etc.
5. Repeat for the `venue.pending` branch → another **Append Row** node →
   **`Venues`** tab, mapping `{{ $json.body.data.venue_id }}`, etc.
6. **Activate** the workflow (toggle top-right). The Production URL only works when active.

> Field path note: n8n puts the POST body under `$json.body`. If you used the Test
> URL while building, switch env to the **Production** URL once activated.

---

## 5. Testing

1. **Lead test:** submit a booking inquiry on a venue page → a row appears on the
   **Leads** tab within seconds, and the lead is in Supabase / `/admin`.
2. **Venue test:** submit a venue via *Add venue* → a row appears on the **Venues**
   tab, and the venue is in Supabase as `pending_review`.
3. **n8n-down test:** in n8n, **deactivate** the workflow (or temporarily set a wrong
   `N8N_WEBHOOK_URL` locally) → submit again. The lead/venue **still saves to
   Supabase**; the only effect is a `n8n ... mirror failed` line in the server log.
   No 500, no user-facing error.
4. **Secret test:** POST to the webhook URL **without** the `x-webhook-secret`
   header (e.g. from a browser) → n8n returns **401/403**. Random callers can't add rows.
5. **No secrets exposed:** the secret is only in env + n8n; it's never in the client
   bundle, never logged (errors log status + a short snippet only).

---

## 6. Security checklist

- ✅ One-way only — no Google Sheets → Supabase automatic import.
- ✅ Supabase is the source of truth; Sheets is a tracking mirror.
- ✅ Webhook protected by `N8N_WEBHOOK_SECRET` (n8n Header Auth).
- ✅ Only whitelisted tracking fields sent; **no** proof docs / private paths.
- ✅ Google credentials live in n8n (OAuth2), **not** in the app — no API keys added.
- ✅ Fire-and-forget with a 4s timeout — n8n never blocks or breaks form submission.
- ✅ Disabled cleanly when `N8N_WEBHOOK_URL` is unset.
