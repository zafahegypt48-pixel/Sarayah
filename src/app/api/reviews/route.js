import { getReviews } from "@/lib/data";
import { getAdminContext } from "@/lib/auth";

// Admin-only: list reviews (optionally filtered by ?status=pending|approved|rejected).
export async function GET(request) {
  const ctx = await getAdminContext();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  try {
    return Response.json(await getReviews(ctx.supabase, { status }));
  } catch (err) {
    console.error("Reviews read failed:", err.message);
    return Response.json({ error: "Could not load reviews." }, { status: 500 });
  }
}
