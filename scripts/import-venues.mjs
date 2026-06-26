// Import REAL venues from a CSV into Supabase. Every imported venue is inserted as
// status=pending_review / verification_status=unverified, so it will NOT appear
// publicly until an admin approves it in /admin. Uses the public anon key (RLS
// allows public venue inserts) — no service-role key required.
//
// Usage:
//   node scripts/import-venues.mjs path/to/your-venues.csv
//   (defaults to scripts/venues.csv)
//
// Template columns: see scripts/venues-template.csv
// Multi-value fields (suitableFor, images) are separated with "|".

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const BOOLS = ["catering", "parking", "bridalRoom", "dj", "decoration", "kidsArea", "ac", "valet"];
const NUMS = ["capacityMin", "capacityMax", "startingPrice"];
const ARRAYS = ["suitableFor", "images"];
const STRINGS = [
  "name", "type", "city", "area", "address", "google_maps_link", "official_website",
  "social_link", "owner_phone", "owner_whatsapp", "owner_email", "indoorOutdoor", "description",
];

// Minimal CSV parser supporting quoted fields with embedded commas/quotes/newlines.
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      if (field !== "" || row.length) { row.push(field); rows.push(row); row = []; field = ""; }
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function toVenue(headers, cols) {
  const raw = {};
  headers.forEach((h, i) => { raw[h.trim()] = (cols[i] ?? "").trim(); });
  const v = {
    status: "pending_review",
    verification_status: "unverified",
    claim_status: "unclaimed",
    source: "import",
  };
  for (const k of STRINGS) if (raw[k]) v[k] = raw[k];
  for (const k of NUMS) if (raw[k] !== undefined && raw[k] !== "") v[k] = Number(raw[k]) || 0;
  for (const k of BOOLS) v[k] = String(raw[k]).toLowerCase() === "true";
  for (const k of ARRAYS) v[k] = raw[k] ? raw[k].split("|").map((s) => s.trim()).filter(Boolean) : [];
  return v;
}

async function run() {
  const file = process.argv[2] || path.join("scripts", "venues.csv");
  if (!fs.existsSync(file)) {
    console.error(`CSV not found: ${file}\nCopy scripts/venues-template.csv and fill it in.`);
    process.exit(1);
  }
  const rows = parseCsv(fs.readFileSync(file, "utf-8")).filter((r) => r.some((c) => c.trim() !== ""));
  if (rows.length < 2) { console.error("CSV has no data rows."); process.exit(1); }
  const headers = rows[0];
  const venues = rows.slice(1).map((r) => toVenue(headers, r)).filter((v) => v.name && v.city);

  if (venues.length === 0) { console.error("No valid rows (each needs at least name + city)."); process.exit(1); }

  const { error } = await supabase.from("venues").insert(venues);
  if (error) { console.error("Import failed:", error.message); process.exit(1); }
  console.log(`Imported ${venues.length} venues as pending_review. Review & approve them in /admin.`);
}

run();
