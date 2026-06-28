import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Next.js 16 renamed Middleware to Proxy (same functionality). This keeps the
// Supabase auth session fresh by reading/refreshing the session cookie on
// every request, so Server Components and Route Handlers see a valid user.
// If Supabase env vars are missing, it's a no-op so the app still runs.
export async function proxy(request) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    // Touch the session so an expired access token gets refreshed.
    await supabase.auth.getUser();
  } catch (e) {
    // Never let a Supabase/auth hiccup 500 the whole site via middleware.
    console.error("proxy session refresh skipped:", e?.message);
  }

  return response;
}

export const config = {
  // Run on everything except static assets and image optimization.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
