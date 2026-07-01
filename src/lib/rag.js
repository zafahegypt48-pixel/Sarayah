// ============================================================================
// RAG retrieval — the AI agent's "search Sarayah's real data" tool.
// ============================================================================
// query_sarayah_database() searches ONLY the app's own database (via the
// resilient searchVenues data layer, which already respects RLS/approved rows
// and falls back to local seed data when Supabase is unreachable). It returns a
// compact, structured context that the agent uses to answer WITHOUT inventing
// prices, venues, capacities, or availability.
//
// UPGRADE PATH: this is a keyword/attribute search over Postgres today. To move
// to a vector DB (ChromaDB / Pinecone / pgvector) later, replace the body of
// `querySarayahDatabase` with your vector query and keep the SAME return shape
// ({ count, results, note }). Nothing else in the agent needs to change.
import { searchVenues } from "./data";
import { localSupportReply } from "./supportAssistant";

const VENUE_TYPES = ["Hotel", "Hall", "Garden", "Villa", "Rooftop", "Restaurant"];

// Known cities/areas (EN + common AR spellings) for the no-LLM local extractor.
const CITY_HINTS = [
  ["Cairo", ["cairo", "القاهرة"]],
  ["Giza", ["giza", "الجيزة"]],
  ["New Cairo", ["new cairo", "القاهرة الجديدة", "التجمع"]],
];
const TYPE_HINTS = [
  ["Hotel", ["hotel", "فندق"]],
  ["Hall", ["hall", "قاعة", "قاعه"]],
  ["Garden", ["garden", "حديقة", "حديقه"]],
  ["Villa", ["villa", "فيلا"]],
  ["Rooftop", ["rooftop", "roof", "سطح"]],
  ["Restaurant", ["restaurant", "مطعم"]],
];

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

// Shape a raw venue row into a small, safe object for the agent's context.
function shapeVenue(v) {
  const priceMin = v.price_min ?? v.startingPrice ?? null;
  const priceMax = v.price_max ?? null;
  return {
    name: v.name,
    type: v.type || null,
    city: v.city || null,
    area: v.area || null,
    indoorOutdoor: v.indoorOutdoor || null,
    capacityMin: v.capacityMin ?? null,
    capacityMax: v.capacityMax ?? null,
    priceFromEGP: priceMin,
    priceToEGP: priceMax && priceMax > (priceMin || 0) ? priceMax : null,
    rating: v.rating || null,
    reviews: v.reviews || null,
    description: v.description ? String(v.description).slice(0, 220) : null,
    url: `/venues/${v.id}`,
  };
}

/**
 * The RAG tool. Searches Sarayah's venue/vendor data with structured filters.
 * @param {object} input  { query?, city?, type?, min_capacity?, max_budget?, category? }
 * @returns {Promise<{count:number, results:object[], note?:string}>}
 */
export async function querySarayahDatabase(input = {}) {
  const filters = {};
  if (input.city && typeof input.city === "string") filters.city = input.city.trim();
  if (input.type && VENUE_TYPES.includes(input.type)) filters.type = input.type;
  if (input.category && typeof input.category === "string") filters.category = input.category.trim();
  const minCap = toNum(input.min_capacity);
  if (minCap) filters.capacity = minCap;
  const maxBudget = toNum(input.max_budget);
  if (maxBudget) filters.budget = maxBudget;

  let venues = [];
  try {
    const res = await searchVenues({ filters, page: 1, pageSize: 8 });
    venues = Array.isArray(res?.venues) ? res.venues : [];
  } catch {
    // Never throw to the agent — an empty result is a valid, honest answer.
    return { count: 0, results: [], note: "search_unavailable" };
  }

  // Optional keyword re-rank: nudge rows whose text matches the free query up.
  const q = String(input.query || "").toLowerCase().trim();
  if (q) {
    const terms = q.split(/\s+/).filter((t) => t.length > 2);
    venues = [...venues].sort((a, b) => scoreRow(b, terms) - scoreRow(a, terms));
  }

  return { count: venues.length, results: venues.slice(0, 6).map(shapeVenue) };
}

function scoreRow(v, terms) {
  const hay = `${v.name || ""} ${v.area || ""} ${v.city || ""} ${v.type || ""} ${v.description || ""}`.toLowerCase();
  return terms.reduce((s, t) => (hay.includes(t) ? s + 1 : s), 0);
}

// --- Local (no-LLM) helpers -------------------------------------------------
// Used by the support route when no AI key is configured, so RAG still works.

// Is this a SEARCH for real listings (vs a how-to / amenity question)? We route
// to the venue database ONLY when the message carries a concrete FILTER
// (city, venue type, guest count, or budget) or an explicit "find a venue"
// phrase. Amenity/how-to questions ("is there parking?", "do you have an app?")
// stay with the knowledge base. Vendor-onboarding phrasing is excluded.
export function looksLikeDataQuery(text) {
  const q = String(text || "").toLowerCase();

  // Exclusions: vendor onboarding / how-to (handled by the knowledge base).
  const listing = ["add my", "list my", "list a venue", "register my", "become a vendor", "اضيف", "أضف", "اضافة", "إضافة", "سجل", "نشاطي", "مكاني"];
  if (listing.some((k) => q.includes(k))) return false;

  // Concrete filters.
  const hasGuests = /(\d{2,6})\s*(guest|guests|people|person|ضيف|ضيوف|شخص)/.test(q);
  const hasBudget = /(under|below|max|budget|egp|ميزانية|اقل من|أقل من|تحت|جنيه)\D{0,6}\d{3,}/.test(q);
  const typeWord = ["hotel", "hall", "garden", "villa", "rooftop", "restaurant", "قاعة", "حديقة", "فندق", "فيلا", "سطح", "مطعم"].some((k) => q.includes(k));
  const cityWord = ["cairo", "giza", "new cairo", "القاهرة", "الجيزة"].some((k) => q.includes(k));

  // Explicit "find/recommend a venue/place" phrasing (EN + AR), even w/o filters.
  const explicitEN = /\b(find|recommend|suggest|looking for|show me|want|need|book|reserve)\b[^.?!]{0,24}\b(venue|venues|place|places|hall|hotel|garden|villa|rooftop|restaurant)\b/.test(q);
  const explicitAR = /(عايز|عاوز|محتاج|دور|دوّر|رشح|اقترح|ابحث|ورّيني|اقترحلي)[^.؟!]{0,24}(مكان|اماكن|أماكن|قاعة|فندق|حديقة|فيلا|سطح)/.test(q);

  return hasGuests || hasBudget || cityWord || typeWord || explicitEN || explicitAR;
}

// Pull structured filters out of free text (best-effort) for local mode.
export function extractFilters(text) {
  const q = String(text || "").toLowerCase();
  const out = {};
  for (const [canon, hints] of CITY_HINTS) if (hints.some((h) => q.includes(h))) { out.city = canon; break; }
  for (const [canon, hints] of TYPE_HINTS) if (hints.some((h) => q.includes(h))) { out.type = canon; break; }
  // guests / capacity: "300 guests", "for 300", "٣٠٠"
  const cap = q.match(/(\d{2,6})\s*(guest|guests|people|person|ضيف|ضيوف|شخص)/);
  if (cap) out.min_capacity = toNum(cap[1]);
  // budget: "under 150000", "budget 150k", "ميزانية 150000"
  const bud = q.match(/(under|below|max|budget|ميزانية|اقل من|أقل من|تحت)\D{0,6}(\d{3,9})(\s*k)?/);
  if (bud) out.max_budget = toNum(bud[3] ? Number(bud[2]) * 1000 : bud[2]);
  out.query = text;
  return out;
}

// Turn RAG results into a friendly chat answer (bilingual) for local mode.
export function formatResultsForChat(data, locale = "en") {
  const ar = locale === "ar";
  const money = (n) => `${Number(n || 0).toLocaleString("en-US")} ${ar ? "ج.م" : "EGP"}`;
  if (!data || data.count === 0) {
    return ar
      ? "لم أجد أماكن مطابقة في بياناتنا الآن. أخبرني بمدينتك، وعدد الضيوف، وميزانيتك التقريبية وسأبحث بدقة أكثر — أو تصفّح كل الأماكن من تبويب «الأماكن»."
      : "I couldn't find matching venues in our data right now. Tell me your city, guest count, and rough budget and I'll search more precisely — or browse everything from the Venues tab.";
  }
  const intro = ar
    ? `لقيت لك ${data.count} ${data.count === 1 ? "مكان" : "أماكن"} من بيانات Sarayah:`
    : `I found ${data.count} ${data.count === 1 ? "venue" : "venues"} in Sarayah's data:`;
  const lines = data.results.slice(0, 4).map((v) => {
    const loc = [v.area, v.city].filter(Boolean).join(", ");
    const cap = v.capacityMax ? (ar ? `حتى ${v.capacityMax} ضيف` : `up to ${v.capacityMax} guests`) : "";
    const price = v.priceFromEGP ? (ar ? `يبدأ من ${money(v.priceFromEGP)}` : `from ${money(v.priceFromEGP)}`) : "";
    const bits = [loc, cap, price].filter(Boolean).join(" · ");
    return `• ${v.name}${bits ? " — " + bits : ""}`;
  });
  const outro = ar
    ? "افتح أي مكان لإرسال طلب. تحب أصفّي أكثر حسب الميزانية أو المدينة؟"
    : "Open any venue to send an inquiry. Want me to narrow by budget or city?";
  return `${intro}\n${lines.join("\n")}\n\n${outro}`;
}

// ============================================================================
// The local RAG answerer — a self-contained retrieval-augmented responder that
// needs NO external LLM. It retrieves from two sources and composes an answer:
//   1) the venue DATABASE (querySarayahDatabase) for venue/price/capacity/city
//      searches, and
//   2) the KNOWLEDGE BASE (localSupportReply — Sarayah FAQ/policies, keyword-
//      scored EN/AR) for how-to and policy questions.
// This is what powers the support chat by default. Claude is optional and only
// used when SUPPORT_USE_AI=1 (see the /api/support route).
// ============================================================================
export async function ragAnswer(text, locale = "en") {
  // Venue search → retrieve from the database and answer from the results only.
  if (looksLikeDataQuery(text)) {
    try {
      const data = await querySarayahDatabase(extractFilters(text));
      return { reply: formatResultsForChat(data, locale), usedData: true, mode: "rag" };
    } catch {
      // fall through to the knowledge base
    }
  }
  // Otherwise → retrieve the best-matching knowledge-base answer.
  return { reply: localSupportReply(text, locale), usedData: false, mode: "rag" };
}
