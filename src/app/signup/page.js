"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useI18n } from "@/lib/i18n/client";

export default function SignupPage() {
  const { t } = useI18n();
  const ts = t.signup;
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    // Send the confirmation email back to THIS environment's callback route.
    // Using window.location.origin means dev → http://localhost:3000/auth/callback
    // and prod → https://sarayah.vercel.app/auth/callback automatically — no
    // hardcoded/localhost URL, and it can never be null in production.
    const emailRedirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : (process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` : undefined);
    const { data, error } = await supabase.auth.signUp({
      email: e.target.email.value,
      password: e.target.password.value,
      options: {
        emailRedirectTo,
        data: {
          full_name: e.target.fullName.value,
          role: e.target.role.value,
        },
      },
    });
    setLoading(false);
    // Surface ANY Supabase error verbatim (rate limits, invalid email, SMTP
    // failures, "Supabase not configured", etc.) — never fail silently.
    if (error) {
      setError(error.message);
      return;
    }
    // Anti-enumeration: Supabase returns a user with an EMPTY identities array
    // when the email is ALREADY registered. Detect it and say so, instead of the
    // misleading "check your email" (which would never arrive).
    const identities = data?.user?.identities;
    if (Array.isArray(identities) && identities.length === 0) {
      setError(ts.alreadyRegistered);
      return;
    }
    // Confirmation on → no session yet → tell them to check email (incl. spam).
    if (!data.session) {
      setMessage(ts.confirmEmail);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="max-w-md mx-auto px-5 py-24">
      <h1 className="font-display text-3xl text-cream mb-2">{ts.title}</h1>
      <p className="text-cream/60 mb-8 text-sm">
        {ts.subtitle}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4 bg-surface border border-hair rounded-2xl p-6">
        <div>
          <label className="text-sm font-medium text-cream/70 block mb-1.5">{ts.fullName}</label>
          <input name="fullName" required className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-cream/70 block mb-1.5">{ts.email}</label>
          <input name="email" type="email" required className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-cream/70 block mb-1.5">{ts.password}</label>
          <input name="password" type="password" required minLength={8} className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-cream/70 block mb-1.5">{ts.iAm}</label>
          <select name="role" className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface">
            <option value="couple">{ts.couple}</option>
            <option value="owner">{ts.owner}</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-emerald">{message}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald text-onnight font-semibold py-3 rounded-full hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? ts.loading : ts.button}
        </button>
      </form>
      <p className="text-sm text-cream/50 mt-4 text-center">
        {ts.haveAccount} <a href="/login" className="text-emerald font-semibold">{ts.loginLink}</a>
      </p>
    </div>
  );
}
