// One-way mirror of new leads & pending venues to n8n, which appends a row to a
// Google Sheet for outreach tracking. Supabase stays the source of truth — this is
// a fire-and-forget side effect only.
//
// GRACEFUL NO-OP when N8N_WEBHOOK_URL is unset, so the app works normally without
// n8n. Callers catch errors, so a down/slow/misconfigured n8n NEVER blocks saving
// to Supabase.
//
// SECURITY:
// - Only the whitelisted tracking fields below are sent. Private data — proof
//   documents / verification_docs paths, admin notes, internal flags, addresses —
//   is NEVER sent to Google Sheets.
// - Requests carry a shared-secret header (N8N_WEBHOOK_SECRET) so random callers
//   can't post to your webhook. Configure n8n to require it (Header Auth) and
//   reject mismatches. The secret lives only in env (app + n8n) — never in code,
//   never in the browser bundle (this module is server-only), never logged.
//
// Configure in .env.local (and Vercel):
//   N8N_WEBHOOK_URL    = https://<you>.app.n8n.cloud/webhook/sarayah-mirror
//   N8N_WEBHOOK_SECRET = <a long random string; also set in n8n Header Auth>

const TIMEOUT_MS = 4000;

async function post(event, data) {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) {
    console.info(`[n8n] disabled (no N8N_WEBHOOK_URL) — skipped: ${event}`);
    return { skipped: true };
  }
  const secret = process.env.N8N_WEBHOOK_SECRET || "";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // n8n "Header Auth" credential should require this exact header/value.
        ...(secret ? { "x-webhook-secret": secret } : {}),
      },
      body: JSON.stringify({ event, data }),
      signal: controller.signal,
    });
    if (!res.ok) {
      // Never log the secret or auth headers — just status + a short snippet.
      throw new Error(`n8n ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    return { sent: true };
  } finally {
    clearTimeout(timer);
  }
}

// Whitelisted LEAD fields only — exactly the tracking columns, nothing internal.
export function mirrorLeadToN8n(lead) {
  return post("lead.created", {
    lead_id: lead.id || null,
    venue_name: lead.venueName || null,
    customer_name: lead.name || null,
    phone: lead.phone || null,
    email: lead.email || null,
    event_date: lead.eventDate || null,
    guests: lead.guests ?? null,
    budget: lead.budget ?? null,
    message: lead.notes || null,
    status: lead.status || "new",
    created_at: lead.createdAt || null,
  });
}

// Whitelisted VENUE fields only. Deliberately EXCLUDES verification_docs / proof
// paths, admin_notes, source, prospect_id, and every other private/internal column.
export function mirrorVenueToN8n(venue) {
  return post("venue.pending", {
    venue_id: venue.id || null,
    venue_name: venue.name || null,
    city: venue.city || null,
    owner_name: venue.owner_name || null,
    owner_phone: venue.owner_phone || null,
    owner_whatsapp: venue.owner_whatsapp || null,
    owner_email: venue.owner_email || null,
    status: venue.status || "pending_review",
    verification_status: venue.verification_status || "unverified",
    submitted_at: venue.createdAt || new Date().toISOString(),
  });
}
