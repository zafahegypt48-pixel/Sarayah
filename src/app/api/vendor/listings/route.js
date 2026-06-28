import { vendorListings } from "@/lib/data";
import { getUserContext } from "@/lib/auth";

// A logged-in vendor's own listings (all statuses) via the ownership-gated RPC.
export async function GET() {
  const ctx = await getUserContext();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json(await vendorListings(ctx.supabase));
  } catch (err) {
    console.error("Vendor listings read failed:", err.message);
    return Response.json({ error: "Could not load your listings." }, { status: 500 });
  }
}
