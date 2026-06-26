import { createClient } from "@supabase/supabase-js";

// PUBLIC client — uses the anon/publishable key and is therefore subject to RLS.
// Safe for public reads (venues) and public writes the policies allow (submitting
// a venue or a lead). Privileged admin operations do NOT use this client; they run
// server-side with the logged-in admin's session JWT (see src/lib/supabase/server
// + src/lib/auth.getAdminContext), so RLS enforces admin-only access.
//
// We intentionally do NOT use a service-role/secret key here — there is no
// service-role key in this app, which removes the risk of ever leaking one.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function makeStub() {
  const result = async () => ({ data: null, error: new Error("Supabase not configured") });
  const chain = () => ({ select: result, insert: result, update: result, delete: result, eq: () => chain(), order: () => chain(), single: result });
  return { from: () => chain(), rpc: result };
}

let supabase;
if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "Supabase env vars are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local — see .env.example. Falling back to local seed data."
  );
  supabase = makeStub();
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
}

export { supabase };
