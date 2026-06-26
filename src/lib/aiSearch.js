// Lightweight natural-language -> filter parser for the AI search assistant.
// This runs locally with no API key needed, so the MVP works out of the box.
// To upgrade to a real LLM: replace parseQuery() body with a call to
// POST https://api.anthropic.com/v1/messages, asking the model to return
// JSON matching this same filter shape (see comment at bottom of file).

// Order matters: multi-word / more-specific cities first so "new cairo" wins over "cairo".
const CITIES = [
  "new cairo", "6th of october", "sheikh zayed", "sharm el sheikh", "port said",
  "cairo", "giza", "alexandria", "hurghada", "mansoura", "luxor", "aswan", "tanta",
  "october", "maadi", "zamalek", "heliopolis",
];
const TYPES = ["hotel", "hall", "garden", "villa", "rooftop", "restaurant", "outdoor"];
const EVENTS = ["wedding", "engagement", "birthday", "corporate event", "corporate"];

// Allowed values used to sanitize parser/LLM output before filtering, so a bad or
// unexpected value can never produce a broken query.
const VENUE_TYPES = ["hotel", "hall", "garden", "villa", "rooftop", "restaurant"];
const SUITABLE = ["Wedding", "Engagement", "Birthday", "Corporate Event"];
const BOOL_KEYS = ["catering", "parking", "dj", "bridalRoom", "kidsArea", "valet"];

// Keep only known keys with sane, typed values. Drops anything unexpected.
export function sanitizeFilters(raw) {
  const f = raw && typeof raw === "object" ? raw : {};
  const out = {};
  if (typeof f.location === "string" && f.location.trim()) out.location = f.location.trim().toLowerCase();
  if (f.indoorOutdoor === "Indoor" || f.indoorOutdoor === "Outdoor") out.indoorOutdoor = f.indoorOutdoor;
  if (typeof f.type === "string" && VENUE_TYPES.includes(f.type.toLowerCase())) out.type = f.type.toLowerCase();
  if (typeof f.suitableFor === "string" && SUITABLE.includes(f.suitableFor)) out.suitableFor = f.suitableFor;
  const cap = Number(f.capacity);
  if (Number.isFinite(cap) && cap > 0 && cap <= 100000) out.capacity = Math.round(cap);
  const bud = Number(f.budget);
  if (Number.isFinite(bud) && bud > 0) out.budget = Math.round(bud);
  for (const k of BOOL_KEYS) if (f[k] === true) out[k] = true;
  return out;
}

export function parseQuery(text) {
  const q = text.toLowerCase();
  const filters = {};

  // Location
  for (const city of CITIES) {
    if (q.includes(city)) {
      filters.location = city;
      break;
    }
  }

  // Indoor / outdoor
  if (q.includes("outdoor")) filters.indoorOutdoor = "Outdoor";
  else if (q.includes("indoor")) filters.indoorOutdoor = "Indoor";

  // Venue type
  for (const t of TYPES) {
    if (q.includes(t) && t !== "outdoor") {
      filters.type = t;
      break;
    }
  }

  // Event type
  for (const e of EVENTS) {
    if (q.includes(e)) {
      filters.suitableFor = e.includes("corporate") ? "Corporate Event" : e[0].toUpperCase() + e.slice(1);
      break;
    }
  }

  // Capacity ("300 people", "for 300", "300 guests")
  const capMatch = q.match(/(\d{2,4})\s*(people|guests|persons)?/);
  if (capMatch) filters.capacity = parseInt(capMatch[1], 10);

  // Budget ("budget 100000", "under 100,000", "100k egp")
  const budgetMatch = q.match(/(budget|under|below|max)?\s*([\d,]{4,})\s*(egp|le|pounds)?/i);
  if (budgetMatch && budgetMatch[2]) {
    const num = parseInt(budgetMatch[2].replace(/,/g, ""), 10);
    if (num > 1000) filters.budget = num;
  }
  const kMatch = q.match(/(\d{2,4})\s*k\b/);
  if (kMatch) filters.budget = parseInt(kMatch[1], 10) * 1000;

  // Amenities
  filters.catering = q.includes("catering");
  filters.parking = q.includes("parking");
  filters.dj = q.includes("dj") || q.includes("music");
  filters.bridalRoom = q.includes("bridal");
  filters.kidsArea = q.includes("kids");
  filters.valet = q.includes("valet");

  return filters;
}

export function matchVenues(venues, filters) {
  return venues.filter((v) => {
    if (filters.location) {
      const loc = (v.city + " " + v.area).toLowerCase();
      if (!loc.includes(filters.location)) return false;
    }
    if (filters.indoorOutdoor && v.indoorOutdoor !== "Both" && v.indoorOutdoor !== filters.indoorOutdoor) return false;
    if (filters.type && v.type.toLowerCase() !== filters.type) return false;
    if (filters.suitableFor && !v.suitableFor.includes(filters.suitableFor)) return false;
    if (filters.capacity && v.capacityMax < filters.capacity) return false;
    if (filters.budget && v.startingPrice > filters.budget) return false;
    if (filters.catering && !v.catering) return false;
    if (filters.parking && !v.parking) return false;
    if (filters.dj && !v.dj) return false;
    if (filters.bridalRoom && !v.bridalRoom) return false;
    if (filters.kidsArea && !v.kidsArea) return false;
    if (filters.valet && !v.valet) return false;
    return true;
  });
}

/* ---- Upgrade path to a real LLM (optional, later) ----
const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
  body: JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [{ role: "user", content: `Extract venue search filters as JSON only (location, type, indoorOutdoor, capacity, budget, suitableFor, catering, parking, dj, bridalRoom, kidsArea, valet) from: "${text}"` }],
  }),
});
*/
