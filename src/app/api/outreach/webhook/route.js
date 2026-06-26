import { supabase } from "@/lib/supabaseClient";
import { n8nSecretOk } from "@/lib/outreach";

// GET — WhatsApp Cloud API webhook verification handshake (only used if you point
// WhatsApp directly at this route instead of through n8n). Echoes hub.challenge
// when the verify token matches WHATSAPP_VERIFY_TOKEN.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge || "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// POST — generic event receiver for n8n (reply received, status change, etc.).
// Requires the N8N_WEBHOOK_SECRET. Mirrors prospect state into Supabase if a
// prospect_id is supplied. The Google Sheet stays the source of truth.
export async function POST(request) {
  if (!n8nSecretOk(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const event = String(body.event || "event").slice(0, 60);
  const prospectId = body.prospect_id ? String(body.prospect_id).slice(0, 100) : null;

  // Log a non-sensitive line (never log tokens/secrets).
  console.info(`[outreach] webhook event=${event} prospect=${prospectId || "-"}`);

  if (prospectId) {
    try {
      const row = {
        prospect_id: prospectId,
        last_event: event,
        updated_at: new Date().toISOString(),
      };
      if (body.whatsapp_number) row.whatsapp_number = String(body.whatsapp_number).slice(0, 30);
      if (body.status) row.status = String(body.status).slice(0, 40);
      if (typeof body.registered === "boolean") row.registered = body.registered;
      if (body.venue_id) row.venue_id = String(body.venue_id).slice(0, 100);
      await supabase.from("outreach_prospects").upsert(row, { onConflict: "prospect_id" });
    } catch (e) {
      console.error("[outreach] webhook mirror failed:", e.message);
    }
  }

  return Response.json({ ok: true });
}
