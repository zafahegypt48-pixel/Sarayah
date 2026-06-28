// Bilingual (Arabic + English) natural-language → filter parser for the AI search
// assistant. Runs locally with no API key, so the MVP works out of the box and is
// the fallback when the Claude parser (aiSearchLLM.js) isn't configured.
//
// Arabic terms are mapped to the SAME canonical English values the venue data is
// stored in (e.g. "القاهرة الجديدة" → "new cairo", "فندق" → "hotel"), so
// matchVenues() — which compares against English-stored fields — works unchanged.

// Allowed values used to sanitize parser/LLM output before filtering, so a bad or
// unexpected value can never produce a broken query.
const VENUE_TYPES = ["hotel", "hall", "garden", "villa", "rooftop", "restaurant"];
const SUITABLE = ["Wedding", "Engagement", "Birthday", "Corporate Event"];
const BOOL_KEYS = ["catering", "parking", "dj", "bridalRoom", "kidsArea", "valet"];

// --- Synonym tables (needle → canonical). Order matters: more specific / multi-
// word needles first so e.g. "new cairo" wins over "cairo". Canonical location
// values are lowercase substrings that appear in the venues' city/area fields. ---
const LOCATIONS = [
  ["القاهرة الجديدة", "new cairo"], ["التجمع", "new cairo"], ["new cairo", "new cairo"],
  ["السادس من اكتوبر", "october"], ["السادس من أكتوبر", "october"], ["6th of october", "october"],
  ["6 october", "october"], ["اكتوبر", "october"], ["أكتوبر", "october"], ["october", "october"],
  ["الشيخ زايد", "sheikh zayed"], ["sheikh zayed", "sheikh zayed"],
  ["شرم الشيخ", "sharm"], ["شرم", "sharm"], ["sharm el sheikh", "sharm"], ["sharm", "sharm"],
  ["بورسعيد", "port said"], ["بور سعيد", "port said"], ["port said", "port said"],
  ["مصر الجديدة", "heliopolis"], ["هليوبوليس", "heliopolis"], ["heliopolis", "heliopolis"],
  ["الزمالك", "zamalek"], ["زمالك", "zamalek"], ["zamalek", "zamalek"],
  ["المعادي", "maadi"], ["معادي", "maadi"], ["maadi", "maadi"],
  ["القاهرة", "cairo"], ["cairo", "cairo"],
  ["الجيزة", "giza"], ["جيزة", "giza"], ["giza", "giza"],
  ["الاسكندرية", "alexandria"], ["الإسكندرية", "alexandria"], ["اسكندرية", "alexandria"], ["alexandria", "alexandria"],
  ["الغردقة", "hurghada"], ["hurghada", "hurghada"],
  ["المنصورة", "mansoura"], ["mansoura", "mansoura"],
  ["الاقصر", "luxor"], ["الأقصر", "luxor"], ["luxor", "luxor"],
  ["اسوان", "aswan"], ["أسوان", "aswan"], ["aswan", "aswan"],
  ["طنطا", "tanta"], ["tanta", "tanta"],
];

const TYPE_MAP = [
  ["فنادق", "hotel"], ["فندق", "hotel"], ["hotel", "hotel"],
  ["قاعات", "hall"], ["قاعة", "hall"], ["صالة", "hall"], ["hall", "hall"], ["ballroom", "hall"],
  ["حدائق", "garden"], ["حديقة", "garden"], ["جاردن", "garden"], ["garden", "garden"],
  ["فيلات", "villa"], ["فيللا", "villa"], ["فيلا", "villa"], ["villa", "villa"],
  ["روف", "rooftop"], ["سطح", "rooftop"], ["تراس", "rooftop"], ["rooftop", "rooftop"],
  ["مطاعم", "restaurant"], ["مطعم", "restaurant"], ["restaurant", "restaurant"],
];

const EVENT_MAP = [
  ["زفاف", "Wedding"], ["أفراح", "Wedding"], ["افراح", "Wedding"], ["فرح", "Wedding"],
  ["أعراس", "Wedding"], ["اعراس", "Wedding"], ["عرس", "Wedding"], ["زواج", "Wedding"], ["wedding", "Wedding"],
  ["خطوبة", "Engagement"], ["خطبة", "Engagement"], ["engagement", "Engagement"],
  ["عيد ميلاد", "Birthday"], ["ميلاد", "Birthday"], ["birthday", "Birthday"],
  ["شركات", "Corporate Event"], ["شركة", "Corporate Event"], ["مؤتمر", "Corporate Event"], ["corporate", "Corporate Event"],
];

const OUTDOOR_NEEDLES = ["في الهواء الطلق", "الهواء الطلق", "مفتوح", "خارجي", "اوت دور", "outdoor"];
const INDOOR_NEEDLES = ["قاعة مغلقة", "مغلق", "داخلي", "ان دور", "indoor"];

const AMENITY_NEEDLES = {
  catering: ["بوفيه", "تموين", "كاترينج", "الأكل", "الطعام", "catering"],
  parking: ["موقف", "باركينج", "انتظار سيارات", "جراج", "parking"],
  dj: ["دي جيه", "دي جي", "ديجي", "نظام صوت", "موسيقى", "dj", "music"],
  bridalRoom: ["غرفة العروس", "غرفة عروس", "bridal"],
  kidsArea: ["منطقة أطفال", "العاب اطفال", "أطفال", "kids"],
  valet: ["صف سيارات", "خدمة ركن", "فاليه", "valet"],
};

// Capacity / budget hint words (Arabic + English).
const GUEST_WORDS = "شخص|اشخاص|أشخاص|ضيف|ضيوف|فرد|افراد|أفراد|مدعو|people|guests|persons|pax";
const BUDGET_WORDS = "ميزانية|بميزانية|سعر|بسعر|بحدود|اقل من|أقل من|تحت|حتى|في حدود|under|below|less than|max|budget|up to";
const CURRENCY = "جنيه|ج\\.?م|جم|egp|le|pound|pounds";
const THOUSAND = "الف|ألف|آلاف|k|thousand";

// Convert Arabic-Indic / Persian digits to ASCII so the numeric regexes work.
const DIGIT_MAP = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};
function normalizeDigits(s) {
  return s.replace(/[٠-٩۰-۹]/g, (d) => DIGIT_MAP[d] ?? d);
}

function firstNeedle(haystack, pairs) {
  for (const [needle, value] of pairs) {
    if (haystack.includes(needle)) return value;
  }
  return null;
}

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
  const q = normalizeDigits(String(text || "").toLowerCase());
  const filters = {};

  // Location, venue type, event type (first matching synonym wins).
  const location = firstNeedle(q, LOCATIONS);
  if (location) filters.location = location;
  const type = firstNeedle(q, TYPE_MAP);
  if (type) filters.type = type;
  const event = firstNeedle(q, EVENT_MAP);
  if (event) filters.suitableFor = event;

  // Indoor / outdoor (outdoor checked first; "Both" venues match either later).
  if (OUTDOOR_NEEDLES.some((n) => q.includes(n))) filters.indoorOutdoor = "Outdoor";
  else if (INDOOR_NEEDLES.some((n) => q.includes(n))) filters.indoorOutdoor = "Indoor";

  // Budget — detect via explicit signals so it isn't confused with guest count.
  let rest = q;
  const budget = parseBudget(q);
  if (budget != null) {
    filters.budget = budget;
    // Remove the matched amount so it can't also be read as a capacity.
    rest = q.replace(/[\d,]+\s*(الف|ألف|آلاف|k|thousand|جنيه|ج\.?م|جم|egp|le|pound|pounds)?/g, (m, unit) =>
      unit ? " " : m
    );
  }

  // Capacity — number near a guest word, or after "for/لـ", else a leftover number.
  const capacity = parseCapacity(rest, q);
  if (capacity != null) filters.capacity = capacity;

  // Amenities.
  for (const [key, needles] of Object.entries(AMENITY_NEEDLES)) {
    if (needles.some((n) => q.includes(n))) filters[key] = true;
  }

  return filters;
}

function parseBudget(q) {
  // "200k" / "٢٠٠ ألف" → ×1000. (No \b after the unit — it's an ASCII-only
  // boundary that never matches right after an Arabic letter like ألف.)
  const kMatch = q.match(new RegExp(`(\\d[\\d,]*)\\s*(?:${THOUSAND})(?![a-z])`));
  if (kMatch) {
    const n = parseInt(kMatch[1].replace(/,/g, ""), 10);
    if (Number.isFinite(n)) return n * 1000;
  }
  // budget keyword followed by a number ("under 200000", "أقل من 150000", "ميزانية 100000")
  const kw = q.match(new RegExp(`(?:${BUDGET_WORDS})\\s*([\\d,]{3,})`));
  if (kw) {
    const n = parseInt(kw[1].replace(/,/g, ""), 10);
    if (n >= 1000) return n;
  }
  // number followed by a currency ("150000 جنيه", "100000 egp")
  const cur = q.match(new RegExp(`([\\d,]{4,})\\s*(?:${CURRENCY})`));
  if (cur) {
    const n = parseInt(cur[1].replace(/,/g, ""), 10);
    if (n >= 1000) return n;
  }
  return null;
}

function parseCapacity(rest, original) {
  // Number directly followed by a guest word: "300 ضيف", "300 guests".
  const withWord = rest.match(new RegExp(`(\\d{1,6})\\s*(?:${GUEST_WORDS})`));
  if (withWord) return clampCap(withWord[1]);
  // Number after "for" / "لـ" / "ل" / "عدد": "for 300", "لـ 300".
  const afterFor = rest.match(/(?:for|لـ|ل|عدد)\s*(\d{2,6})/);
  if (afterFor) return clampCap(afterFor[1]);
  // Fallback: any standalone 2–4 digit number left after budget removal.
  const bare = rest.match(/\b(\d{2,4})\b/);
  if (bare) return clampCap(bare[1]);
  return null;
}

function clampCap(s) {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 && n <= 100000 ? n : null;
}

export function matchVenues(venues, filters) {
  return venues.filter((v) => {
    if (filters.location) {
      const loc = (v.city + " " + (v.area || "")).toLowerCase();
      if (!loc.includes(filters.location)) return false;
    }
    if (filters.indoorOutdoor && v.indoorOutdoor !== "Both" && v.indoorOutdoor !== filters.indoorOutdoor) return false;
    if (filters.type && v.type.toLowerCase() !== filters.type) return false;
    if (filters.suitableFor && !(v.suitableFor || []).includes(filters.suitableFor)) return false;
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
