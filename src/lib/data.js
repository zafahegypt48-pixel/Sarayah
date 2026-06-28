import { supabase } from "./supabaseClient";
import venuesSeed from "../data/venues_seed.json";

// Provide the same API shape whether using Supabase or a local JSON fallback.
const usingSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

// Admin/privileged functions accept an optional `client`. Pass the request-scoped
// authenticated client (from getAdminContext) so the operation runs as the admin
// user and RLS permits it. Public functions use the default anon `supabase`.

// Simple in-memory leads store for local fallback (not persisted).
const localLeads = [];

// Columns safe to expose publicly. Excludes private owner contact details, admin
// notes, verification notes/docs, contact tracking, and internal flags — those are
// only returned to admins (via { all: true } with the authenticated client).
const PUBLIC_VENUE_COLUMNS =
  "id,name,type,city,area,indoorOutdoor,capacityMin,capacityMax,startingPrice,halls," +
  "venueSize,catering,parking,bridalRoom,dj,decoration,kidsArea,ac,valet,suitableFor," +
  "rating,reviews,description,images,verification_status,verified_at,created_at," +
  // marketplace (Phase 1) public columns:
  "category_id,slug,price_min,price_max,attributes,governorate_id,city_id";

// Pre-marketplace column set — used as a fallback when the Phase 1 migration
// hasn't been applied yet, so the app degrades gracefully instead of 500ing.
const LEGACY_VENUE_COLUMNS =
  "id,name,type,city,area,indoorOutdoor,capacityMin,capacityMax,startingPrice,halls," +
  "venueSize,catering,parking,bridalRoom,dj,decoration,kidsArea,ac,valet,suitableFor," +
  "rating,reviews,description,images,verification_status,verified_at,created_at";

export async function getVenues(client = supabase, { all = false } = {}) {
  if (usingSupabase) {
    if (all) {
      // Admin: full columns via SECURITY DEFINER RPC (column grants restrict even
      // the authenticated role; the RPC bypasses that but is gated by is_admin()).
      const { data, error } = await client.rpc("admin_list_venues");
      if (error) throw error;
      return data;
    }
    // Public/anon + non-admin: only public-safe columns (also enforced by DB
    // column grants), and RLS limits rows to approved/verified.
    try {
      const { data, error } = await client.from("venues").select(PUBLIC_VENUE_COLUMNS).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    } catch (e) {
      // Marketplace columns not migrated yet → legacy fallback so AI search etc. still work.
      console.error("getVenues fallback to legacy:", e.message);
      try {
        const { data, error } = await client.from("venues").select(LEGACY_VENUE_COLUMNS).order("created_at", { ascending: false });
        if (error) throw error;
        return data;
      } catch (e2) {
        console.error("getVenues legacy failed:", e2.message);
        return [];
      }
    }
  }

  // Return the seed data for offline development
  return venuesSeed;
}

// Which categories are LIVE vs "coming soon" — re-exported from the standalone
// module so server data consumers can import it from here too.
export { ACTIVE_CATEGORIES, isCategoryActive } from "./categories";

// Public, filtered + paginated venue listing. Filtering and pagination happen in
// the DATABASE (not the client) so the listing scales past a handful of venues.
// `filters` keys mirror the FilterSidebar: city, type, indoorOutdoor, capacity
// (min seats needed), budget (max starting price), suitableFor, and the amenity
// booleans. Returns { venues, total } where total is the full match count (for
// pagination), capped to public/approved rows by RLS + column grants.
const LISTING_AMENITIES = ["catering", "parking", "dj", "bridalRoom"];

export async function searchVenues({ filters = {}, page = 1, pageSize = 12 } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.min(48, Math.max(1, Number(pageSize) || 12));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  if (usingSupabase) {
    try {
      let q = supabase.from("venues").select(PUBLIC_VENUE_COLUMNS, { count: "exact" });
      // marketplace facets (apply across all categories):
      if (filters.category) q = q.eq("category_id", filters.category);
      if (filters.governorate) q = q.eq("governorate_id", filters.governorate);
      if (filters.cityId) q = q.eq("city_id", filters.cityId);
      if (filters.priceMax) q = q.lte("price_min", filters.priceMax);
      // venue-specific facets (legacy; used when browsing the Venues category):
      if (filters.city) q = q.eq("city", filters.city);
      if (filters.type) q = q.eq("type", filters.type);
      // "Both" venues satisfy either Indoor or Outdoor requests.
      if (filters.indoorOutdoor) q = q.in("indoorOutdoor", [filters.indoorOutdoor, "Both"]);
      if (filters.capacity) q = q.gte("capacityMax", filters.capacity);
      if (filters.budget) q = q.lte("startingPrice", filters.budget);
      if (filters.suitableFor) q = q.contains("suitableFor", [filters.suitableFor]);
      for (const a of LISTING_AMENITIES) if (filters[a]) q = q.eq(a, true);
      q = q.order("created_at", { ascending: false }).range(from, to);
      const { data, count, error } = await q;
      if (error) throw error;
      return { venues: data || [], total: count ?? (data ? data.length : 0) };
    } catch (e) {
      // Marketplace columns not migrated yet → fall back to a legacy venue query
      // so existing approved venues still render. A non-Venues category yields none.
      console.error("searchVenues fallback to legacy:", e.message);
      if (filters.category && filters.category !== "venues") return { venues: [], total: 0 };
      try {
        let q = supabase.from("venues").select(LEGACY_VENUE_COLUMNS, { count: "exact" });
        if (filters.city) q = q.eq("city", filters.city);
        if (filters.type) q = q.eq("type", filters.type);
        if (filters.indoorOutdoor) q = q.in("indoorOutdoor", [filters.indoorOutdoor, "Both"]);
        if (filters.capacity) q = q.gte("capacityMax", filters.capacity);
        if (filters.budget) q = q.lte("startingPrice", filters.budget);
        q = q.order("created_at", { ascending: false }).range(from, to);
        const { data, count, error } = await q;
        if (error) throw error;
        return { venues: data || [], total: count ?? (data ? data.length : 0) };
      } catch (e2) {
        console.error("searchVenues legacy fallback failed:", e2.message);
        return { venues: [], total: 0 };
      }
    }
  }

  // Offline seed fallback: filter + paginate in memory.
  const matched = venuesSeed.filter((v) => seedMatches(v, filters));
  return { venues: matched.slice(from, to + 1), total: matched.length };
}

function seedMatches(v, f) {
  // Seed data is venues-only; any non-venues category yields no matches offline.
  if (f.category && f.category !== "venues") return false;
  if (f.priceMax && (v.price_min ?? v.startingPrice) > f.priceMax) return false;
  if (f.city && v.city !== f.city) return false;
  if (f.type && v.type !== f.type) return false;
  if (f.indoorOutdoor && v.indoorOutdoor !== f.indoorOutdoor && v.indoorOutdoor !== "Both") return false;
  if (f.capacity && v.capacityMax < f.capacity) return false;
  if (f.budget && v.startingPrice > f.budget) return false;
  if (f.suitableFor && !(v.suitableFor || []).includes(f.suitableFor)) return false;
  for (const a of LISTING_AMENITIES) if (f[a] && !v[a]) return false;
  return true;
}

// --- Marketplace reference data + listing lookups ---------------------------
// Offline fallbacks mirror marketplace_phase1.sql so the app runs without Supabase.
const CATEGORIES_SEED = [
  { id: "venues", name_en: "Venues", name_ar: "قاعات وأماكن", icon: "🏛️", sort_order: 1 },
  { id: "photography", name_en: "Photography", name_ar: "تصوير فوتوغرافي", icon: "📷", sort_order: 2 },
  { id: "videography", name_en: "Videography", name_ar: "تصوير فيديو", icon: "🎥", sort_order: 3 },
  { id: "makeup-hair", name_en: "Makeup & Hair", name_ar: "مكياج وتسريحات", icon: "💄", sort_order: 4 },
  { id: "catering", name_en: "Catering & Buffet", name_ar: "بوفيه وضيافة", icon: "🍽️", sort_order: 5 },
  { id: "entertainment", name_en: "DJ & Zaffa", name_ar: "دي جيه وزفة", icon: "🥁", sort_order: 6 },
  { id: "wedding-dresses", name_en: "Wedding Dresses", name_ar: "فساتين زفاف", icon: "👰", sort_order: 7 },
  { id: "flowers-decor", name_en: "Flowers & Decor", name_ar: "زهور وديكور", icon: "💐", sort_order: 8 },
  { id: "cakes-sweets", name_en: "Cakes & Sweets", name_ar: "كيك وحلويات", icon: "🎂", sort_order: 9 },
  { id: "invitations", name_en: "Invitations", name_ar: "دعوات ومطبوعات", icon: "✉️", sort_order: 10 },
  { id: "wedding-cars", name_en: "Wedding Cars", name_ar: "سيارات أفراح", icon: "🚗", sort_order: 11 },
  { id: "planners", name_en: "Wedding Planners", name_ar: "منظمو حفلات", icon: "📋", sort_order: 12 },
];
const GOVERNORATES_SEED = [
  { id: "cairo", name_en: "Cairo", name_ar: "القاهرة", sort_order: 1 },
  { id: "giza", name_en: "Giza", name_ar: "الجيزة", sort_order: 2 },
  { id: "alexandria", name_en: "Alexandria", name_ar: "الإسكندرية", sort_order: 3 },
];

export async function getCategories() {
  if (usingSupabase) {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name_en,name_ar,icon,sort_order,parent_id")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      if (data && data.length) return data;
    } catch (e) {
      // Marketplace tables not migrated yet — degrade gracefully to the seed set.
      console.error("getCategories fallback to seed:", e.message);
    }
  }
  return CATEGORIES_SEED;
}

export async function getCategory(id) {
  const all = await getCategories();
  return all.find((c) => c.id === id) || null;
}

export async function getGovernorates() {
  if (usingSupabase) {
    try {
      const { data, error } = await supabase
        .from("governorates")
        .select("id,name_en,name_ar,sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      if (data && data.length) return data;
    } catch (e) {
      console.error("getGovernorates fallback to seed:", e.message);
    }
  }
  return GOVERNORATES_SEED;
}

export async function getCities(governorateId) {
  if (usingSupabase) {
    try {
      let q = supabase.from("cities").select("id,governorate_id,name_en,name_ar,sort_order").order("sort_order", { ascending: true });
      if (governorateId) q = q.eq("governorate_id", governorateId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error("getCities fallback:", e.message);
    }
  }
  return [];
}

// Public listing detail by slug (any category). Public columns + RLS only.
export async function getListingBySlug(slug, client = supabase) {
  if (usingSupabase) {
    const { data, error } = await client.from("venues").select(PUBLIC_VENUE_COLUMNS).eq("slug", slug).single();
    if (error) return null;
    return data;
  }
  return venuesSeed.find((v) => v.slug === slug) || null;
}

// --- Packages (vendor offerings; public read for approved listings) ---------
export async function getPackages(listingId) {
  if (!usingSupabase) return [];
  const { data, error } = await supabase
    .from("packages")
    .select("id,name_en,name_ar,price,currency,includes,sort_order")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });
  if (error) return [];
  return data;
}

// All approved/verified listing slugs (for the sitemap). Capped for safety.
export async function getAllListingSlugs() {
  if (!usingSupabase) return venuesSeed.map((v) => ({ slug: v.slug || v.id, updated_at: v.created_at }));
  const { data, error } = await supabase
    .from("venues")
    .select("slug,updated_at,created_at")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) return [];
  return (data || []).map((v) => ({ slug: v.slug, updated_at: v.updated_at || v.created_at }));
}

// --- Reviews ---------------------------------------------------------------
// Approved reviews for a listing (public; RLS shows only status='approved').
export async function getApprovedReviews(listingId) {
  if (!usingSupabase) return [];
  const { data, error } = await supabase
    .from("reviews")
    .select("id,author_name,rating,title,body,created_at")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data;
}

// Public review submission. Forced to status='pending' (RLS also enforces this).
export async function addReview({ listingId, authorName, rating, title, body }) {
  if (!usingSupabase) return { skipped: true };
  const row = {
    listing_id: listingId,
    author_name: authorName,
    rating,
    title: title || null,
    body: body || null,
    status: "pending",
  };
  const { error } = await supabase.from("reviews").insert([row]);
  if (error) throw error;
  return { ...row };
}

// Admin: list reviews (optionally by status) via the admin's JWT client.
export async function getReviews(client, { status } = {}) {
  let q = client.from("reviews").select("*").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

// Admin: set a review's moderation status (approve/reject). The DB trigger
// recomputes the listing's rating/reviews_count on change.
export async function updateReviewStatus(id, status, client) {
  const { data, error } = await client.from("reviews").update({ status }).eq("id", id).select();
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Review not updated — not found or not permitted.");
  return data[0];
}

// --- Vendor self-service (Phase 4) -----------------------------------------
// All via SECURITY DEFINER RPCs gated on claimed_by_user_id = auth.uid(), so a
// vendor only ever touches their OWN rows and can never change moderation status.
export async function vendorListings(client) {
  if (!usingSupabase) return [];
  const { data, error } = await client.rpc("vendor_list_listings");
  if (error) throw error;
  return data;
}

export async function vendorUpdateListing(id, patch, client) {
  if (!usingSupabase) return null;
  const { data, error } = await client.rpc("vendor_update_listing", { p_id: id, p: patch });
  if (error) throw error;
  return (data && data[0]) || null;
}

export async function vendorLeads(client) {
  if (!usingSupabase) return [];
  const { data, error } = await client.rpc("vendor_list_leads");
  if (error) throw error;
  return data;
}

export async function getVenueById(id, client = supabase, { all = false } = {}) {
  if (usingSupabase) {
    if (all) {
      const { data, error } = await client.rpc("admin_get_venue", { p_id: id });
      if (error) return null;
      return (data && data[0]) || null;
    }
    let { data, error } = await client.from("venues").select(PUBLIC_VENUE_COLUMNS).eq("id", id).single();
    if (error) {
      // Fall back to legacy columns if the marketplace migration isn't applied.
      ({ data, error } = await client.from("venues").select(LEGACY_VENUE_COLUMNS).eq("id", id).single());
      if (error) return null;
    }
    return data;
  }

  return venuesSeed.find((v) => v.id === id) || null;
}

function slugify(name, id) {
  const base = String(name || "listing").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${base}-${String(id || "").replace(/[^a-z0-9]/gi, "").slice(1, 7) || Math.abs(Date.now() % 1e6)}`;
}

export async function addVenue(venue) {
  // Force moderation defaults server-side — a submission is NEVER public until an
  // admin approves it, and can never be self-marked verified.
  const safeVenue = {
    ...venue,
    // Marketplace: default to the Venues category + a unique slug; carry the
    // owner if the submitter was logged in (claimed_by_user_id set by the route).
    category_id: venue.category_id || "venues",
    slug: venue.slug || slugify(venue.name, venue.id),
    status: "pending_review",
    verification_status: "unverified",
    claim_status: venue.claim_status === "claim_pending" ? "claim_pending" : "unclaimed",
    verified_at: null,
    verified_by_admin: null,
  };

  if (usingSupabase) {
    // Don't chain .select(): a pending venue can't be read back by the anon client
    // (RLS only exposes approved/verified), which would 500 the insert.
    const { error } = await supabase.from("venues").insert([safeVenue]);
    if (error) throw error;
    return { ...safeVenue };
  }

  // Local fallback: push to seed array (not persisted across restarts)
  venuesSeed.unshift(safeVenue);
  return safeVenue;
}

// Append-only audit log of important admin actions. Best-effort: never throws.
export async function logVenueAudit(client, { venueId, action, actorEmail, details }) {
  if (!usingSupabase) return;
  try {
    await client.from("venue_audit").insert([
      { venue_id: venueId || null, action, actor_email: actorEmail || null, details: details || null },
    ]);
  } catch (e) {
    console.error("Audit log failed:", e.message);
  }
}

export async function updateVenue(id, updates, client = supabase) {
  if (usingSupabase) {
    // Confirm the update by reading back only `id` (the only column the
    // authenticated role can SELECT directly after column-grant hardening).
    // Empty result = RLS blocked it (not admin) or the venue doesn't exist.
    const { data, error } = await client.from("venues").update(updates).eq("id", id).select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Venue not updated — not found or not permitted.");
    }
    // Return the FULL updated row via the admin RPC (full columns, gated by is_admin()).
    const { data: full } = await client.rpc("admin_get_venue", { p_id: id });
    return (full && full[0]) || { id };
  }

  const idx = venuesSeed.findIndex((v) => v.id === id);
  if (idx === -1) return null;
  venuesSeed[idx] = { ...venuesSeed[idx], ...updates };
  return venuesSeed[idx];
}

export async function deleteVenue(id, client = supabase) {
  if (usingSupabase) {
    // Read back only `id` to confirm deletion (zero rows = RLS blocked / not found).
    const { data, error } = await client.from("venues").delete().eq("id", id).select("id");
    if (error) throw error;
    return Array.isArray(data) && data.length > 0;
  }

  const idx = venuesSeed.findIndex((v) => v.id === id);
  if (idx === -1) return false;
  venuesSeed.splice(idx, 1);
  return true;
}

export async function getLeads(client = supabase) {
  if (usingSupabase) {
    const { data, error } = await client.from("leads").select("*").order("createdAt", { ascending: false });
    if (error) throw error;
    return data;
  }

  return localLeads.slice().reverse();
}

export async function updateLead(id, updates, client = supabase) {
  if (usingSupabase) {
    const { data, error } = await client.from("leads").update(updates).eq("id", id).select();
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Lead not updated — not found or not permitted.");
    }
    return data[0];
  }

  const idx = localLeads.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  localLeads[idx] = { ...localLeads[idx], ...updates };
  return localLeads[idx];
}

export async function addLead(lead) {
  if (usingSupabase) {
    // Public can INSERT leads but (by RLS) cannot SELECT them back, so we must
    // NOT chain .select() here — that read-back would fail for anon users.
    const { error } = await supabase.from("leads").insert([lead]);
    if (error) throw error;
    // Return the input (plus a client timestamp) for the response/notification.
    return { ...lead, createdAt: new Date().toISOString() };
  }

  localLeads.push({ ...lead, id: `l${Date.now()}`, createdAt: new Date().toISOString() });
  return localLeads[localLeads.length - 1];
}
