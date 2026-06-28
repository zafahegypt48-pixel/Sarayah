import { vendorUpdateListing } from "@/lib/data";
import { getUserContext } from "@/lib/auth";

// Whitelisted, owner-safe fields a vendor may edit on their own listing. The RPC
// also re-checks ownership and never touches moderation/verification columns.
const EDITABLE = new Set([
  "name", "description", "area", "city", "governorate_id", "city_id",
  "price_min", "price_max", "attributes", "images",
]);
const NUMERIC = new Set(["price_min", "price_max"]);

export async function PATCH(request, { params }) {
  const ctx = await getUserContext();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const patch = {};
  for (const [k, v] of Object.entries(body)) {
    if (!EDITABLE.has(k)) continue;
    if (k === "attributes") { if (v && typeof v === "object" && !Array.isArray(v)) patch[k] = v; }
    else if (k === "images") { if (Array.isArray(v)) patch[k] = v; }
    else if (NUMERIC.has(k)) patch[k] = Number(v) || 0;
    else patch[k] = v;
  }
  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "No editable fields provided." }, { status: 400 });
  }

  try {
    const listing = await vendorUpdateListing(id, patch, ctx.supabase);
    if (!listing) return Response.json({ error: "Not found or not yours." }, { status: 404 });
    return Response.json(listing);
  } catch (err) {
    console.error("Vendor listing update failed:", err.message);
    return Response.json({ error: "Could not update your listing." }, { status: 500 });
  }
}
