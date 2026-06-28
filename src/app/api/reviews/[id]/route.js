import { updateReviewStatus } from "@/lib/data";
import { getAdminContext } from "@/lib/auth";

const VALID = new Set(["approved", "rejected", "pending"]);

// Admin-only: moderate a review. The DB trigger recomputes the listing's rating.
export async function PATCH(request, { params }) {
  const ctx = await getAdminContext();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  if (!VALID.has(body.status)) return Response.json({ error: "Invalid status." }, { status: 400 });
  try {
    const review = await updateReviewStatus(id, body.status, ctx.supabase);
    return Response.json(review);
  } catch (err) {
    console.error("Review update failed:", err.message);
    return Response.json({ error: "Could not update review." }, { status: 500 });
  }
}
