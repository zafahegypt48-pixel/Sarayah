"use client";
import { createBrowserClient } from "@supabase/ssr";

// Cookie-based Supabase client for use in client components (login, signup,
// logout, favorites, settings). Uses the public anon key only — never the
// service-role key.
//
// Hardened: if the env vars are missing (e.g. not set on the host at build
// time), @supabase/ssr's createBrowserClient THROWS — which would crash every
// client component that creates a client during render and 500 the whole page.
// Instead we return a no-op stub so the UI still renders (logged-out, no data).
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function makeStub() {
  const authErr = { data: { user: null, session: null }, error: new Error("Supabase not configured") };
  const dataErr = async () => ({ data: null, error: new Error("Supabase not configured") });
  const chain = () => {
    const c = {
      select: () => c, insert: dataErr, update: () => c, upsert: dataErr, delete: () => c,
      eq: () => c, neq: () => c, order: () => c, limit: () => c, range: () => c, in: () => c,
      single: dataErr, maybeSingle: dataErr,
      then: (resolve) => resolve({ data: [], error: null }),
    };
    return c;
  };
  return {
    auth: {
      getUser: async () => authErr,
      getSession: async () => authErr,
      signInWithPassword: async () => authErr,
      signUp: async () => authErr,
      signOut: async () => ({ error: null }),
      updateUser: async () => authErr,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    from: () => chain(),
    rpc: dataErr,
  };
}

export function createSupabaseBrowserClient() {
  if (!URL || !KEY) {
    if (typeof console !== "undefined") {
      console.warn("Supabase env vars missing — running with a no-op client (logged-out, no data).");
    }
    return makeStub();
  }
  return createBrowserClient(URL, KEY);
}
