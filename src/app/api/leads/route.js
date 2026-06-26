import { randomUUID } from "crypto";
import { addLead, getLeads } from "@/lib/data";
import { getAdminContext } from "@/lib/auth";
import { notifyNewLead, notifyCoupleInquiryReceived } from "@/lib/notify";
import { mirrorLeadToN8n } from "@/lib/n8n";
import { validateLead } from "@/lib/validation";
import { checkRateLimit, tooManyRequests } from "@/lib/ratelimit";

// Only persist the fields we expect — ignore anything extra the client sends.
function sanitizeLead(body) {
  return {
    // App-generated id so Supabase and any downstream mirror (n8n → Sheet) share
    // the same key (anon can't read the DB-generated id back through RLS).
    id: "l" + randomUUID().replace(/-/g, ""),
    venueId: body.venueId || null,
    venueName: body.venueName || null,
    name: String(body.name || "").trim(),
    phone: String(body.phone || "").trim(),
    email: String(body.email || "").trim(),
    eventDate: body.eventDate || null,
    eventType: body.eventType || null,
    guests: body.guests ? Number(body.guests) : null,
    budget: body.budget ? Number(body.budget) : null,
    notes: body.notes ? String(body.notes).trim() : null,
  };
}

export async function POST(request) {
  const rl = await checkRateLimit(request, { name: "lead", limit: 5, windowSeconds: 600 });
  if (!rl.ok) return tooManyRequests();

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Server-side validation — the same rules the form enforces, not bypassable.
  const { valid, errors } = validateLead(body);
  if (!valid) {
    return Response.json({ error: "Please check the form.", errors }, { status: 400 });
  }

  try {
    const lead = await addLead(sanitizeLead(body));
    // Fire-and-forget emails (no-op without RESEND_API_KEY; never block saving).
    notifyNewLead(lead).catch((e) => console.error("Lead admin notify failed:", e.message));
    notifyCoupleInquiryReceived(lead).catch((e) => console.error("Couple confirm failed:", e.message));
    // Fire-and-forget mirror to n8n → Google Sheet (no-op without N8N_WEBHOOK_URL).
    mirrorLeadToN8n(lead).catch((e) => console.error("n8n lead mirror failed:", e.message));
    return Response.json(lead, { status: 201 });
  } catch (err) {
    console.error("Failed to save lead:", err.message);
    return Response.json({ error: "Could not save your inquiry. Please try again." }, { status: 500 });
  }
}

export async function GET() {
  // Leads contain personal contact info — admins only. Read as the admin (JWT)
  // so RLS permits it; public users (anon key) are blocked by RLS.
  const ctx = await getAdminContext();
  if (!ctx) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const leads = await getLeads(ctx.supabase);
    return Response.json(leads);
  } catch (err) {
    console.error("Failed to read leads:", err.message);
    return Response.json({ error: "Could not load leads." }, { status: 500 });
  }
}
