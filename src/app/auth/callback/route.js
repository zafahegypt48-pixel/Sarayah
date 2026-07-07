import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Auth callback — where Supabase sends the user AFTER they click "Confirm email"
// (and after OAuth / magic links). It completes the sign-in by turning the
// one-time credential in the URL into a real session cookie, then redirects the
// user back into the app. Without this route, confirmation links have nowhere to
// land and the session is never created.
//
// Handles both flows Supabase can produce:
//   • PKCE:        ?code=...            -> exchangeCodeForSession
//   • token_hash:  ?token_hash=&type=  -> verifyOtp   (works cross-device too)
export const dynamic = "force-dynamic";

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const errorDescription = url.searchParams.get("error_description");
  const nextParam = url.searchParams.get("next") || "/";
  const next = nextParam.startsWith("/") ? nextParam : "/";

  // Build the PUBLIC origin. On Vercel the request sits behind a proxy, so trust
  // x-forwarded-* (falls back to the request origin, then NEXT_PUBLIC_SITE_URL).
  const fwdHost = request.headers.get("x-forwarded-host");
  const fwdProto = request.headers.get("x-forwarded-proto") || "https";
  const base = fwdHost
    ? `${fwdProto}://${fwdHost}`
    : (url.origin || process.env.NEXT_PUBLIC_SITE_URL || "");
  const to = (path) => NextResponse.redirect(`${base}${path}`);

  if (errorDescription) return to("/login?error=confirm");

  try {
    const supabase = await createSupabaseServerClient();
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return to(next);
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (!error) return to(next);
    }
  } catch {
    /* fall through to the error redirect */
  }
  return to("/login?error=confirm");
}
