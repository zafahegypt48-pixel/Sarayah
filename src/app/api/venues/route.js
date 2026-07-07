import { randomUUID } from "crypto";
import { addVenue, getVenues, searchVenues } from "@/lib/data";
import { getAdminContext, getCurrentUser } from "@/lib/auth";
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
  // marketplace fields (any category):
  "category_id", "governorate_id", "city_id", "price_min", "price_max",
  // contact / proof details the submitter provides for later verification:
  "owner_name", "owner_role", "owner_email", "owner_phone", "owner_whatsapp",
  "official_website", "google_maps_link", "social_link",
]);
const NUMERIC = new Set(["capacityMin", "capacityMax", "startingPrice", "halls", "venueSize", "price_min", "price_max"]);
const CATEGORY_SLUGS = new Set([
  "venues", "photography", "videography", "makeup-hair", "catering", "entertainment",
  "wedding-dresses", "flowers-decor", "cakes-sweets", "invitations", "wedding-cars", "planners",
]);

// Whitelisted public listing filters and their coercion (string vs. positive int
// vs. boolean). Anything else in the query string is ignored.
const VENUE_TYPES = ["Hotel", "Hall", "Garden", "Villa", "Rooftop", "Restaurant"];
const SETTINGS = ["Indoor", "Outdoor"];
const SUITABLE = ["Wedding", "Engagement", "Birthday", "Corporate Event"];

function parseListingFilters(searchParams) {
  const f = {};
  // Marketplace facets (slugs from reference tables — bounded length, no enum
  // needed because a bad slug simply matches nothing).
  const category = searchParams.get("category");
  if (category) f.category = String(category).slice(0, 40);
  const governorate = searchParams.get("governorate");
  if (governorate) f.governorate = String(governorate).slice(0, 40);
  const cityId = searchParams.get("cityId");
  if (cityId) f.cityId = String(cityId).slice(0, 40);
  const priceMax = Number(searchParams.get("priceMax"));
  if (Number.isFinite(priceMax) && priceMax > 0) f.priceMax = Math.round(priceMax);
  // Legacy venue facets:
  const city = searchParams.get("city");
  if (city) f.city = String(city).slice(0, 80);
  const type = searchParams.get("type");
  if (VENUE_TYPES.includes(type)) f.type = type;
  const setting = searchParams.get("indoorOutdoor");
  if (SETTINGS.includes(setting)) f.indoorOutdoor = setting;
  const suitableFor = searchParams.get("suitableFor");
  if (SUITABLE.includes(suitableFor)) f.suitableFor = suitableFor;
  const cap = Number(searchParams.get("capacity"));
  if (Number.isFinite(cap) && cap > 0 && cap <= 100000) f.capacity = Math.round(cap);
  const bud = Number(searchParams.get("budget"));
  if (Number.isFinite(bud) && bud > 0) f.budget = Math.round(bud);
  for (const a of ["catering", "parking", "dj", "bridalRoom"]) {
    if (searchParams.get(a) === "true") f[a] = true;
  }
  return f;
}

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

  // Public listing: filtered + paginated in the DB. Returns { venues, total, page, pageSize }.
  try {
    const filters = parseListingFilters(searchParams);
    const page = Number(searchParams.get("page")) || 1;
    const pageSize = Number(searchParams.get("pageSize")) || 12;
    const { venues, total } = await searchVenues({ filters, page, pageSize });
    return Response.json({ venues, total, page, pageSize });
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
  // Validate category against the known set (bad/unknown → addVenue defaults to "venues").
  if (venue.category_id && !CATEGORY_SLUGS.has(venue.category_id)) delete venue.category_id;
  // Category-specific structured fields (free-form JSON, bounded by the DB column).
  if (body.attributes && typeof body.attributes === "object" && !Array.isArray(body.attributes)) {
    venue.attributes = body.attributes;
  }
  // Starting price doubles as the listing's price_min if not given explicitly.
  if (!venue.price_min && venue.startingPrice) venue.price_min = venue.startingPrice;
  venue.authorization_confirmed = true;
  // If the submitter is logged in, they OWN this listing (vendor self-service):
  // stamp the authenticated user UUID, and default owner_email to their verified
  // account email when they left it blank — so the listing is ALWAYS linkable to
  // them (directly by id, and re-claimable by email after a later login).
  const submitter = await getCurrentUser();
  if (submitter) {
    venue.claimed_by_user_id = submitter.id;
    if (!venue.owner_email && submitter.email) venue.owner_email = submitter.email;
  }
  // App-generated id so Supabase and any downstream mirror (n8n → Sheet) share the
  // same key (anon can't read the DB-generated id back through RLS).
  venue.id = "v" + randomUUID().replace(/-/g, "");
  // Server-side count caps (per-file SIZE is enforced by the Supabase Storage
  // bucket file_size_limit — 10 MB images / 20 MB docs — since files upload
  // directly to Storage, not through this route).
  if (Array.isArray(venue.images)) venue.images = venue.images.slice(0, 12);
  // Private proof doc paths (must be paths in the venue-docs bucket, not URLs).
  if (Array.isArray(body.verification_docs)) {
    venue.verification_docs = body.verification_docs
      .filter((p) => typeof p === "string" && p.startsWith("proof/"))
      .slice(0, 6);
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
