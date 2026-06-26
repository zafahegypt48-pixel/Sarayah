import { updateLead } from "@/lib/data";
import { getAdminContext } from "@/lib/auth";

const VALID_STATUSES = new Set(["new", "contacted", "booked", "closed"]);

// Admin updates a lead's status (new | contacted | booked | closed).
export async function PATCH(request, { params }) {
  const ctx = await getAdminContext();
  if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  if (!VALID_STATUSES.has(body.status)) {
    return Response.json({ error: "Invalid status." }, { status: 400 });
  }

  try {
    const lead = await updateLead(
      id,
      { status: body.status, status_updated_at: new Date().toISOString() },
      ctx.supabase
    );
    if (!lead) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(lead);
  } catch (err) {
    console.error("Lead update failed:", err.message);
    return Response.json({ error: "Could not update lead." }, { status: 500 });
  }
}
