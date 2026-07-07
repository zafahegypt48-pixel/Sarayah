import { vendorClaimVenue, vendorMyClaims } from "@/lib/data";
import { getUserContext } from "@/lib/auth";

// Submit a claim for a listing (by its link or slug/id). The RPC decides:
// auto-claim on verified-email match, else a pending admin-reviewed request.
export async function POST(request) {
  const ctx = await getUserContext();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const raw = String(body.ident || "").trim();
  if (!raw) return Response.json({ error: "Enter your venue's link or slug." }, { status: 400 });
  // Accept a full URL or a bare slug/id — take the last path segment.
  const ident = raw.replace(/[?#].*$/, "").replace(/\/+$/, "").split("/").pop();
  try {
    const result = await vendorClaimVenue(ident, ctx.supabase);
    return Response.json(result);
  } catch (err) {
    console.error("Claim submit failed:", err.message);
    return Response.json({ error: "Could not process the claim." }, { status: 500 });
  }
}

// The caller's own claim requests (for the dashboard).
export async function GET() {
  const ctx = await getUserContext();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json(await vendorMyClaims(ctx.supabase));
  } catch {
    return Response.json([]);
  }
}
