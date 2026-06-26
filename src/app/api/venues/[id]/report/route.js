import { supabase } from "@/lib/supabaseClient";
import { checkRateLimit, tooManyRequests } from "@/lib/ratelimit";

const REASONS = new Set(["fake", "wrong_info", "not_owner", "other"]);

// Public can report a listing. RLS allows insert-only (admins read/triage).
export async function POST(request, { params }) {
  const rl = await checkRateLimit(request, { name: "report", limit: 5, windowSeconds: 600 });
  if (!rl.ok) return tooManyRequests();

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const reason = REASONS.has(body.reason) ? body.reason : "other";
  const details = body.details ? String(body.details).slice(0, 1000) : null;
  const reporter_contact = body.reporter_contact ? String(body.reporter_contact).slice(0, 200) : null;

  try {
    const { error } = await supabase.from("venue_reports").insert([
      { venue_id: id, reason, details, reporter_contact },
    ]);
    if (error) throw error;
    return Response.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("Report submit failed:", err.message);
    return Response.json({ error: "Could not submit report." }, { status: 500 });
  }
}
