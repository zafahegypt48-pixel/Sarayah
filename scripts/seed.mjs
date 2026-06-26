// Loads the DEMO placeholder venues into Supabase for local/dev use.
// These are NOT real venues — they insert as `pending_review` and will NOT appear
// publicly until an admin approves them. For real data use scripts/import-venues.mjs.
//
// Uses the public anon key (RLS allows public venue inserts). No service-role key.
//
// Usage:  node scripts/seed.mjs

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const venues = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "src/data/venues_seed.json"), "utf-8")
).map((v) => ({ ...v, status: "pending_review", verification_status: "unverified", source: "demo_seed" }));

async function seed() {
  // No .select() — pending venues aren't readable by the anon key (RLS).
  const { error } = await supabase.from("venues").insert(venues);
  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
  console.log(`Inserted ${venues.length} DEMO venues (pending_review). Approve them in /admin to make them public.`);
}

seed();
