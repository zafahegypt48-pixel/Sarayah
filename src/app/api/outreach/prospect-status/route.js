import { supabase } from "@/lib/supabaseClient";
import { n8nSecretOk } from "@/lib/outreach";

// POST /api/outreach/prospect-status — n8n updates a prospect's tracking status in
// Supabase (mirror of the Google Sheet). Requires the N8N_WEBHOOK_SECRET.
export async function POST(request) {
  if (!n8nSecretOk(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const prospectId = body.prospect_id ? String(body.prospect_id).slice(0, 100) : null;
  if (!prospectId) {
    return Response.json({ error: "prospect_id is required" }, { status: 400 });
  }

  const row = { prospect_id: prospectId, updated_at: new Date().toISOString() };
  if (body.status) row.status = String(body.status).slice(0, 40);
  if (body.whatsapp_number) row.whatsapp_number = String(body.whatsapp_number).slice(0, 30);
  if (typeof body.registered === "boolean") row.registered = body.registered;
  if (body.venue_id) row.venue_id = String(body.venue_id).slice(0, 100);
  if (body.notes) row.notes = String(body.notes).slice(0, 500);

  try {
    const { error } = await supabase.from("outreach_prospects").upsert(row, { onConflict: "prospect_id" });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[outreach] prospect-status failed:", e.message);
    return Response.json({ error: "Could not update prospect." }, { status: 500 });
  }
}
