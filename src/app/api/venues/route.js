import { randomUUID } from "crypto";
import { addVenue, getVenues } from "@/lib/data";
import { getAdminContext } from "@/lib/auth";
import { notifyNewVenueSubmission, notifyOwnerVenueReceived } from "@/lib/notify";
import { mirrorVenueToN8n } from "@/lib/n8n";
import { checkRateLimit, tooManyRequests } from "@/lib/ratelimit";

// Fields a public submitter may set. Moderation/verification fields are NEVER
// accepted from the client — they're forced server-side (see addVenue).
const ALLOWED = new Set([
  "name", "type", "city", "area", "indoorOutdoor",
  "capacityMin", "capacityMax", "startingPrice", "halls", "venueSize",
  "description", "suitableFor", "images",
  "catering", "parking", "bridalRoom", "dj", "decoration", "kidsArea", "ac", "valet",
  // contact / proof details the submitter provides for later verification:
  "owner_name", "owner_role", "owner_email", "owner_phone", "owner_whatsapp",
  "official_website", "google_maps_link", "social_link",
]);
const NUMERIC = new Set(["capacityMin", "capacityMax", "startingPrice", "halls", "venueSize"]);

// Never cache — venue visibility depends on live moderation status.
export const dynamic = "force-dynamic";

export async function GET(request) {
  // Admin scope returns ALL venues (incl. pending) via the admin's session; the
  // default public scope returns only approved/verified (enforced by RLS).
  const { searchParams } = new URL(request.url);
  if (searchParams.get("scope") === "admin") {
    const ctx = await getAdminContext();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    try {
      return Response.json(await getVenues(ctx.supabase, { all: true }));
    } catch (err) {
      console.error("Admin venues read failed:", err.message);
      return Response.json({ error: "Could not load venues." }, { status: 500 });
    }
  }

  try {
    return Response.json(await getVenues());
  } catch (err) {
    console.error("Venues read failed:", err.message);
    return Response.json({ error: "Could not load venues." }, { status: 500 });
  }
}

export async function POST(request) {
  const rl = await checkRateLimit(request, { name: "venue", limit: 3, windowSeconds: 1800 });
  if (!rl.ok) return tooManyRequests();

  const body = await request.json().catch(() => ({}));
  if (!body.name || !body.city) {
    return Response.json({ error: "Venue name and city are required." }, { status: 400 });
  }
  // Required: submitter must confirm they're authorized to list the venue.
  if (body.authorization_confirmed !== true) {
    return Response.json(
      { error: "You must confirm you are the owner or an authorized representative of this venue." },
      { status: 400 }
    );
  }

  // Whitelist user-provided fields; coerce numerics.
  const venue = {};
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED.has(key)) continue;
    venue[key] = NUMERIC.has(key) ? Number(value) || 0 : value;
  }
  venue.authorization_confirmed = true;
  // App-generated id so Supabase and any downstream mirror (n8n → Sheet) share the
  // same key (anon can't read the DB-generated id back through RLS).
  venue.id = "v" + randomUUID().replace(/-/g, "");
  // Private proof doc paths (must be paths in the venue-docs bucket, not URLs).
  if (Array.isArray(body.verification_docs)) {
    venue.verification_docs = body.verification_docs
      .filter((p) => typeof p === "string" && p.startsWith("proof/"))
      .slice(0, 10);
  }
  // Outreach attribution (safe metadata only).
  venue.source = body.source === "whatsapp_outreach" ? "whatsapp_outreach" : "public";
  if (body.prospect_id) venue.prospect_id = String(body.prospect_id).slice(0, 100);
  if (body.claim_status === "claim_pending") venue.claim_status = "claim_pending";

  try {
    const created = await addVenue(venue); // forces pending_review / unverified
    notifyNewVenueSubmission(created).catch((e) => console.error("Venue admin notify failed:", e.message));
    notifyOwnerVenueReceived(created).catch((e) => console.error("Owner confirm failed:", e.message));
    // Fire-and-forget mirror to n8n → Google Sheet (no-op without N8N_WEBHOOK_URL).
    mirrorVenueToN8n(created).catch((e) => console.error("n8n venue mirror failed:", e.message));
    return Response.json(
      { ...created, message: "Submitted for review. Your venue will appear once an admin approves it." },
      { status: 201 }
    );
  } catch (err) {
    console.error("Venue submit failed:", err.message);
    return Response.json({ error: "Could not submit venue. Please try again." }, { status: 500 });
  }
}
