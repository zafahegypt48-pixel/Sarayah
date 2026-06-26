import { getVenueById, updateVenue, deleteVenue, logVenueAudit } from "@/lib/data";
import { getAdminContext } from "@/lib/auth";

// Fields an admin is allowed to edit — anything else in the body is ignored.
const EDITABLE = new Set([
  "name", "type", "city", "area", "indoorOutdoor",
  "capacityMin", "capacityMax", "startingPrice", "halls", "venueSize",
  "description", "suitableFor", "images",
  "catering", "parking", "bridalRoom", "dj", "decoration", "kidsArea", "ac", "valet",
  // moderation / verification (admin-only):
  "status", "verification_status", "claim_status",
  "verification_method", "verification_notes",
  // contact tracking (admin-only):
  "owner_phone", "owner_whatsapp", "owner_email", "contact_status", "admin_notes",
]);
const NUMERIC = new Set(["capacityMin", "capacityMax", "startingPrice", "halls", "venueSize"]);
const VENUE_STATUSES = new Set(["pending_review", "approved", "rejected", "suspended", "verified"]);
const VERIFICATION_STATUSES = new Set(["unverified", "claim_pending", "claimed", "verified", "rejected"]);
const CONTACT_STATUSES = new Set([
  "not_contacted", "contacted", "interested", "needs_follow_up", "registered", "not_interested", "do_not_contact",
]);

export async function GET(request, { params }) {
  const { id } = await params;
  const venue = await getVenueById(id);
  if (!venue) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(venue);
}

export async function PATCH(request, { params }) {
  // Editing venues is admin-only. Run the write as the admin (JWT) so RLS allows it.
  const ctx = await getAdminContext();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  // Whitelist + coerce numeric fields.
  const updates = {};
  for (const [key, value] of Object.entries(body)) {
    if (!EDITABLE.has(key)) continue;
    updates[key] = NUMERIC.has(key) ? Number(value) || 0 : value;
  }
  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No editable fields provided." }, { status: 400 });
  }

  // Validate enum fields.
  if (updates.status && !VENUE_STATUSES.has(updates.status)) {
    return Response.json({ error: "Invalid status." }, { status: 400 });
  }
  // Stamp the relevant lifecycle timestamp when status changes (updated_at is
  // auto-set by a DB trigger).
  if (updates.status === "approved") updates.approved_at = new Date().toISOString();
  if (updates.status === "rejected") updates.rejected_at = new Date().toISOString();
  if (updates.status === "suspended") updates.suspended_at = new Date().toISOString();
  if (updates.verification_status && !VERIFICATION_STATUSES.has(updates.verification_status)) {
    return Response.json({ error: "Invalid verification status." }, { status: 400 });
  }
  if (updates.contact_status) {
    if (!CONTACT_STATUSES.has(updates.contact_status)) {
      return Response.json({ error: "Invalid contact status." }, { status: 400 });
    }
    // Stamp when contact status changes, so the admin sees recency.
    updates.last_contacted_at = new Date().toISOString();
  }

  // Stamp verification metadata when (un)verifying — only an admin reaches here.
  if (updates.verification_status === "verified") {
    updates.verified_at = new Date().toISOString();
    updates.verified_by_admin = ctx.user.email;
  } else if (updates.verification_status && updates.verification_status !== "verified") {
    updates.verified_at = null;
    updates.verified_by_admin = null;
  }

  try {
    const venue = await updateVenue(id, updates, ctx.supabase);
    if (!venue) return Response.json({ error: "Not found" }, { status: 404 });
    // Audit moderation/verification changes.
    if (updates.status || updates.verification_status || updates.claim_status) {
      await logVenueAudit(ctx.supabase, {
        venueId: id,
        action: "venue_moderation_update",
        actorEmail: ctx.user.email,
        details: {
          status: updates.status,
          verification_status: updates.verification_status,
          claim_status: updates.claim_status,
        },
      });
    }
    return Response.json(venue);
  } catch (err) {
    console.error("Venue update failed:", err.message);
    return Response.json({ error: "Could not update venue." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  // Deleting venues is admin-only. Run the delete as the admin (JWT) so RLS allows it.
  const ctx = await getAdminContext();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const ok = await deleteVenue(id, ctx.supabase);
    if (!ok) {
      // No row deleted: either it doesn't exist or RLS blocked it.
      return Response.json({ error: "Venue not found or could not be deleted." }, { status: 404 });
    }
    await logVenueAudit(ctx.supabase, { venueId: id, action: "venue_deleted", actorEmail: ctx.user.email });
    return Response.json({ success: true });
  } catch (err) {
    console.error("Venue delete failed:", err.message);
    return Response.json({ error: "Could not delete venue." }, { status: 500 });
  }
}
