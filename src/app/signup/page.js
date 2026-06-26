"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SignupPage() {
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
    const { data, error } = await supabase.auth.signUp({
      email: e.target.email.value,
      password: e.target.password.value,
      options: {
        data: {
          full_name: e.target.fullName.value,
          role: e.target.role.value,
        },
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // If email confirmation is on, there's no active session yet.
    if (!data.session) {
      setMessage("Check your email to confirm your account, then log in.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="max-w-md mx-auto px-5 py-24">
      <h1 className="font-display text-3xl text-ink mb-2">Sign up</h1>
      <p className="text-ink/60 mb-8 text-sm">
        Create an account to list venues or track your inquiries.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-line rounded-2xl p-6">
        <div>
          <label className="text-sm font-medium text-ink/70 block mb-1.5">Full name</label>
          <input name="fullName" required className="w-full border border-line rounded-lg px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-ink/70 block mb-1.5">Email</label>
          <input name="email" type="email" required className="w-full border border-line rounded-lg px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-ink/70 block mb-1.5">Password</label>
          <input name="password" type="password" required minLength={6} className="w-full border border-line rounded-lg px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-ink/70 block mb-1.5">I am a...</label>
          <select name="role" className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white">
            <option value="couple">Couple planning an event</option>
            <option value="owner">Venue owner / manager</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-emerald">{message}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald text-ivory font-semibold py-3 rounded-full hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="text-sm text-ink/50 mt-4 text-center">
        Already have an account? <a href="/login" className="text-emerald font-semibold">Log in</a>
      </p>
    </div>
  );
}
