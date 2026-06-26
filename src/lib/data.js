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
    const { data, error } = await client.from("venues").select(PUBLIC_VENUE_COLUMNS).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }

  // Return the seed data for offline development
  return venuesSeed;
}

export async function getVenueById(id, client = supabase, { all = false } = {}) {
  if (usingSupabase) {
    if (all) {
      const { data, error } = await client.rpc("admin_get_venue", { p_id: id });
      if (error) return null;
      return (data && data[0]) || null;
    }
    const { data, error } = await client.from("venues").select(PUBLIC_VENUE_COLUMNS).eq("id", id).single();
    if (error) return null;
    return data;
  }

  return venuesSeed.find((v) => v.id === id) || null;
}

export async function addVenue(venue) {
  // Force moderation defaults server-side — a submission is NEVER public until an
  // admin approves it, and can never be self-marked verified.
  const safeVenue = {
    ...venue,
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
