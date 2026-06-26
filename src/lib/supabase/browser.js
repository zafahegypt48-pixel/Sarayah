"use client";
import { createBrowserClient } from "@supabase/ssr";

// Cookie-based Supabase client for use in client components (login, signup,
// logout). Uses the public anon key only — never the service-role key.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
