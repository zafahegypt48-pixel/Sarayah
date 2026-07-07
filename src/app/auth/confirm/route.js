import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Robust email-confirmation endpoint (token_hash flow).
//
// The email link points DIRECTLY here with the token in the QUERY string:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/
// Because the token is a query param (not a URL #fragment), a SERVER route can
// read it — unlike the implicit `#access_token` redirect from /auth/v1/verify.
// verifyOtp() both CONFIRMS the email and SETS the session cookie in one step,
// so whichever request hits this first (the user's click) confirms the account.
// This avoids the fragile single-use `token` + implicit-hash chain that was
// producing `otp_expired` before the app ever ran.
export const dynamic = "force-dynamic";

export async function GET(request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type"); // "email" | "signup" | "recovery" | ...
  const rawNext = url.searchParams.get("next") || "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  // Vercel sits behind a proxy — trust x-forwarded-* so we redirect to the
  // public host, not an internal one.
  const fwdHost = request.headers.get("x-forwarded-host");
  const fwdProto = request.headers.get("x-forwarded-proto") || "https";
  const base = fwdHost
    ? `${fwdProto}://${fwdHost}`
    : (url.origin || process.env.NEXT_PUBLIC_SITE_URL || "");
  const to = (path) => NextResponse.redirect(`${base}${path}`);

  if (tokenHash && type) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (!error) return to(next); // confirmed + session cookie set → into the app
    } catch {
      /* fall through */
    }
  }
  return to("/login?error=confirm");
}
