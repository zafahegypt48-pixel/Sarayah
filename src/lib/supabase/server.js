import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cookie-based Supabase client for Server Components and Route Handlers.
// Reads the user's session from cookies so we know who is logged in.
// In Next.js 16 `cookies()` is async, so this helper is async too.
export async function createSupabaseServerClient() {
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
