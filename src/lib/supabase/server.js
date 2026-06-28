import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// No-op stub returned when Supabase env vars are missing, so we never throw at
// the @supabase/ssr layer (which would 500 any server component that builds a
// client). Mirrors the shape callers use: auth.getUser()/getSession().
function makeServerStub() {
  const empty = async () => ({ data: { user: null, session: null }, error: null });
  const chain = () => {
    const c = { select: () => c, insert: async () => ({ data: null, error: null }), update: () => c, delete: () => c, eq: () => c, order: () => c, single: async () => ({ data: null, error: null }), then: (r) => r({ data: [], error: null }) };
    return c;
  };
  return { auth: { getUser: empty, getSession: empty }, from: () => chain(), rpc: async () => ({ data: null, error: null }) };
}

// Cookie-based Supabase client for Server Components and Route Handlers.
// Reads the user's session from cookies so we know who is logged in.
// In Next.js 16 `cookies()` is async, so this helper is async too.
export async function createSupabaseServerClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return makeServerStub();
  }
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // In a Server Component this can throw (cookies are read-only during
          // render). That's fine — the proxy refreshes the session instead.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore: called from a Server Component, handled by proxy.
          }
        },
      },
    }
  );
}
