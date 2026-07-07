import { adminListClaims, adminApproveClaim } from "@/lib/data";
import { getAdminContext } from "@/lib/auth";

// Pending venue-claim requests for admin review.
export async function GET() {
  const ctx = await getAdminContext();
  if (!ctx) return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    return Response.json(await adminListClaims(ctx.supabase));
  } catch (err) {
    console.error("Admin list claims failed:", err.message);
    return Response.json({ error: "Could not load claims." }, { status: 500 });
  }
}

// Approve (assign ownership) or reject a claim.
export async function POST(request) {
  const ctx = await getAdminContext();
  if (!ctx) return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  if (!body.id) return Response.json({ error: "Missing claim id." }, { status: 400 });
  try {
    return Response.json(await adminApproveClaim(body.id, body.approve === true, ctx.supabase));
  } catch (err) {
    console.error("Admin approve claim failed:", err.message);
    return Response.json({ error: "Could not update the claim." }, { status: 500 });
  }
}
