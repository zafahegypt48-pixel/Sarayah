import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./supabase/server";

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
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user || null;
}

// Returns the user only if they are an admin, otherwise null.
export async function getAdminUser() {
  const user = await getCurrentUser();
  if (user && isAdminEmail(user.email)) return user;
  return null;
}

// Returns { user, supabase } where `supabase` is the request-scoped client
// authenticated as the admin (carries their session JWT). Pass `supabase` to the
// privileged data functions so RLS allows the operation. Returns null if the
// caller isn't a logged-in admin. Two layers of defense: this app-level email
// allowlist AND the database RLS admin check.
export async function getAdminContext() {
  const ssr = await createSupabaseServerClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return null;

  // Build a client that EXPLICITLY sends the admin's JWT on every data request,
  // so Postgres RLS (is_admin()) recognises the admin. Relying on the SSR client
  // alone did not reliably attach the token to PostgREST queries.
  const { data: { session } } = await ssr.auth.getSession();
  const token = session?.access_token;
  if (!token) return null;

  // Use the `accessToken` option — supabase-js sends THIS token as the
  // Authorization header on every request and disables its own auth handling.
  // (Passing the token via global.headers.Authorization does NOT work — the
  // client overwrites that header with the anon key when it has no session,
  // so RLS would see the request as anonymous.)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { accessToken: async () => token }
  );
  return { user, supabase };
}
