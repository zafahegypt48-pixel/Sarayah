import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./supabase/server";
import { resolveSupabasePublic } from "./supabase/config";

// Comma-separated list of admin emails, set in .env.local as ADMIN_EMAILS.
// Anyone signing in with one of these emails can reach /admin and the
// protected admin APIs. Everyone else is a regular user.
function adminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email) {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

// Returns the currently logged-in Supabase user, or null if not signed in.
// Hardened: if Supabase env vars are missing/wrong (e.g. not set on the host),
// this returns null instead of throwing — so the navbar (which runs on EVERY
// page) can never 500 the whole site over an auth hiccup.
export async function getCurrentUser() {
  const { url, key } = resolveSupabasePublic();
  if (!url || !key) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user || null;
  } catch {
    return null;
  }
}

// AUTHORITATIVE admin check. Asks Postgres whether THIS session's JWT email is
// present in public.admins, via the SECURITY DEFINER is_admin() function. The
// public.admins table is the single source of truth for authorization — the
// ADMIN_EMAILS env var is NOT trusted to grant access (it can drift from the
// table). Fails CLOSED: any error → not an admin.
async function isSessionAdmin(client) {
  const { data, error } = await client.rpc("is_admin");
  if (error) {
    console.error("is_admin() check failed:", error.message);
    return false;
  }
  return data === true;
}

// Returns the user only if they are an admin (verified against public.admins),
// otherwise null.
export async function getAdminUser() {
  const ctx = await getAdminContext();
  return ctx ? ctx.user : null;
}

// Returns { user, supabase } where `supabase` is the request-scoped client
// authenticated as the admin (carries their session JWT). Pass `supabase` to the
// privileged data functions so RLS allows the operation. Returns null unless the
// caller is a logged-in user whose email is in public.admins — the DATABASE is
// the single source of truth (checked via is_admin()), not the ADMIN_EMAILS env.
export async function getAdminContext() {
  const ssr = await createSupabaseServerClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) return null;

  // Build a client that EXPLICITLY sends the user's JWT on every data request,
  // so Postgres RLS (is_admin()) recognises them. Relying on the SSR client
  // alone did not reliably attach the token to PostgREST queries.
  const { data: { session } } = await ssr.auth.getSession();
  const token = session?.access_token;
  if (!token) return null;

  // Use the `accessToken` option — supabase-js sends THIS token as the
  // Authorization header on every request and disables its own auth handling.
  // (Passing the token via global.headers.Authorization does NOT work — the
  // client overwrites that header with the anon key when it has no session,
  // so RLS would see the request as anonymous.)
  const { url, key } = resolveSupabasePublic();
  const supabase = createClient(url, key, { accessToken: async () => token });

  // AUTHORITATIVE gate: the DB confirms this JWT's email is in public.admins.
  // A normal authenticated user (not in the table) → is_admin() false → null,
  // which every admin route turns into a 403.
  if (!(await isSessionAdmin(supabase))) return null;

  return { user, supabase };
}

// Like getAdminContext but for ANY logged-in user (no admin requirement). Returns
// { user, supabase } where the client carries the user's JWT, so RLS policies that
// check auth.uid() (favorites, profiles) work. Returns null if not signed in.
export async function getUserContext() {
  const ssr = await createSupabaseServerClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) return null;
  const { data: { session } } = await ssr.auth.getSession();
  const token = session?.access_token;
  if (!token) return null;
  const { url, key } = resolveSupabasePublic();
  const supabase = createClient(url, key, { accessToken: async () => token });
  return { user, supabase };
}
