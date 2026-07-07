"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useI18n } from "@/lib/i18n/client";

// Auth callback (CLIENT, not a server route). Supabase's email-confirmation
// redirect returns its result in the URL HASH fragment (e.g. `#access_token=…`
// on success, `#error=…` on failure). A server Route Handler can NEVER read the
// fragment — the browser doesn't send it to the server — which is why the old
// server route always failed. Running in the browser, we read the hash (and the
// query), establish the session, then redirect into the app. Handles all flows:
//   • implicit / hash : #access_token & #refresh_token → setSession
//   • PKCE            : ?code                          → exchangeCodeForSession
//   • token_hash      : ?token_hash & ?type            → verifyOtp
export default function AuthCallbackPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);
  const ran = useRef(false); // guard against double-run (one-time token)

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const u = new URL(window.location.href);
      const q = u.searchParams;
      const hash = new URLSearchParams((u.hash || "").replace(/^#/, ""));

      const rawNext = q.get("next") || "/";
      const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const code = q.get("code");
      const tokenHash = q.get("token_hash");
      const type = q.get("type");
      const hadError = q.get("error") || q.get("error_description") || hash.get("error") || hash.get("error_description");

      // Nothing usable (only an error, or a bare hit) → back to login with a note.
      if (!accessToken && !code && !tokenHash) {
        router.replace("/login?error=confirm");
        return;
      }

      try {
        const supabase = createSupabaseBrowserClient();
        let ok = false;
        if (accessToken && refreshToken) {
          // Implicit flow (current email template): session is in the hash.
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          ok = !error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          ok = !error;
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
          ok = !error;
        }
        if (ok) {
          // Session cookie is now set client-side; refresh so Server Components
          // (navbar, etc.) see the signed-in user, then land in the app.
          router.replace(next);
          router.refresh();
          return;
        }
      } catch {
        /* fall through to the error path */
      }

      if (hadError) { /* keep for clarity — same handling */ }
      setFailed(true);
      router.replace("/login?error=confirm");
    })();
  }, [router]);

  return (
    <div className="max-w-md mx-auto px-5 py-24 text-center">
      <p className="text-cream/70 text-sm">
        {failed ? (t?.login?.confirmError || "") : (t?.signup?.loading || "…")}
      </p>
    </div>
  );
}
