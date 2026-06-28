"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useI18n } from "@/lib/i18n/client";

function LoginInner() {
  const { t } = useI18n();
  const tl = t.login;
  const router = useRouter();
  const params = useSearchParams();
  // Default to home so customers land somewhere useful. Only go to /admin when a
  // protected page explicitly asked for it (e.g. /login?next=/admin).
  const next = params.get("next") || "/";
  const initialError = params.get("error") === "not-admin" ? tl.notAdmin : "";
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: e.target.email.value,
      password: e.target.password.value,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="max-w-md mx-auto px-5 py-24">
      <h1 className="font-display text-3xl text-cream mb-2">{tl.title}</h1>
      <p className="text-cream/60 mb-8 text-sm">
        {tl.subtitle}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4 bg-surface border border-hair rounded-2xl p-6">
        <div>
          <label className="text-sm font-medium text-cream/70 block mb-1.5">{tl.email}</label>
          <input name="email" type="email" required className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-cream/70 block mb-1.5">{tl.password}</label>
          <input name="password" type="password" required className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald text-onnight font-semibold py-3 rounded-full hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? tl.loading : tl.button}
        </button>
      </form>
      <p className="text-sm text-cream/50 mt-4 text-center">
        {tl.noAccount} <a href="/signup" className="text-emerald font-semibold">{tl.signupLink}</a>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
