// Resolve the PUBLIC Supabase config (project URL + anon key). Works on BOTH the
// server (reads process.env at request time) and the client (inlined NEXT_PUBLIC_*
// at build, or the window.__PUBLIC_ENV injected at request time by app/layout.js).
//
// Robustness: if the URL is missing but the anon key is present, we DERIVE the URL
// from the key. A Supabase anon key is a JWT whose payload carries the project
// `ref`, and the hosted API URL is always https://<ref>.supabase.co. So only the
// anon key is strictly required for the app to reach Supabase. Everything here is
// PUBLIC by design (project URL + publishable anon key) — no secret is exposed.

// Decode the project ref from a Supabase anon-key JWT → https://<ref>.supabase.co.
function urlFromAnonKey(key) {
  try {
    const payload = String(key || "").split(".")[1];
    if (!payload) return "";
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    let json = "";
    if (typeof atob === "function") json = atob(b64);
    else if (typeof Buffer !== "undefined") json = Buffer.from(b64, "base64").toString("utf8");
    else return "";
    const ref = JSON.parse(json).ref;
    return ref ? `https://${ref}.supabase.co` : "";
  } catch {
    return "";
  }
}

// runtime = optional { SUPABASE_URL, SUPABASE_ANON_KEY } (client passes window.__PUBLIC_ENV).
export function resolveSupabasePublic(runtime) {
  const r = runtime || {};
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || r.SUPABASE_ANON_KEY || "";
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    r.SUPABASE_URL ||
    urlFromAnonKey(key);
  return { url, key };
}
