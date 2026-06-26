import { supabase } from "@/lib/supabaseClient";
import { checkRateLimit, tooManyRequests } from "@/lib/ratelimit";

// POST /api/outreach/register-click — records that a prospect opened their unique
// registration link. This is called from the browser (the /add-venue page), so it
// is intentionally NOT secret-protected — it's a low-sensitivity tracking ping
// (like analytics) that only writes a click marker for a known prospect_id. It
// returns nothing readable and stores no PII. n8n-facing routes ARE secret-gated.
export async function POST(request) {
  const rl = await checkRateLimit(request, { name: "click", limit: 30, windowSeconds: 600 });
  if (!rl.ok) return tooManyRequests();

  const body = await request.json().catch(() => ({}));
  const prospectId = body.prospect_id ? String(body.prospect_id).slice(0, 100) : null;
  if (!prospectId) {
    return Response.json({ error: "prospect_id is required" }, { status: 400 });
  }

  try {
    await supabase.from("outreach_prospects").upsert(
      { prospect_id: prospectId, last_event: "link_opened", clicks: 1, updated_at: new Date().toISOString() },
      { onConflict: "prospect_id", ignoreDuplicates: false }
    );
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[outreach] register-click failed:", e.message);
    // Best-effort; don't surface internals.
    return Response.json({ ok: true });
  }
}
