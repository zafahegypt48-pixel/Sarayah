import { vendorLeads } from "@/lib/data";
import { getUserContext } from "@/lib/auth";

// Inquiries for the logged-in vendor's listings (ownership-gated RPC).
export async function GET() {
  const ctx = await getUserContext();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json(await vendorLeads(ctx.supabase));
  } catch (err) {
    console.error("Vendor leads read failed:", err.message);
    return Response.json({ error: "Could not load your inquiries." }, { status: 500 });
  }
}
