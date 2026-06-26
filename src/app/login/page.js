"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  // Default to home so customers land somewhere useful. Only go to /admin when a
  // protected page explicitly asked for it (e.g. /login?next=/admin).
  const next = params.get("next") || "/";
  const initialError = params.get("error") === "not-admin"
    ? "That account isn't an admin. Admin tools are for the Zafah team — you're signed in and can browse venues and send inquiries normally."
    : "";
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
      <h1 className="font-display text-3xl text-ink mb-2">Log in</h1>
      <p className="text-ink/60 mb-8 text-sm">
        Sign in to manage your venues and view inquiries.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-line rounded-2xl p-6">
        <div>
          <label className="text-sm font-medium text-ink/70 block mb-1.5">Email</label>
          <input name="email" type="email" required className="w-full border border-line rounded-lg px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-ink/70 block mb-1.5">Password</label>
          <input name="password" type="password" required className="w-full border border-line rounded-lg px-3 py-2.5 text-sm" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald text-ivory font-semibold py-3 rounded-full hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Log in"}
        </button>
      </form>
      <p className="text-sm text-ink/50 mt-4 text-center">
        Don&apos;t have an account? <a href="/signup" className="text-emerald font-semibold">Sign up</a>
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
