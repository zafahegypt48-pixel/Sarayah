// AI Budget Concierge — the planning wedge. Given a couple's budget, guest count,
// city, and event type, it gathers matching venues, scores them deterministically
// (budget fit + right-sizing + value vs. the local average), and — when an
// Anthropic key is set — asks Claude for a short, localized "why it fits / what to
// ask" per venue. Works fully offline (no key): the page renders templated copy
// from the structured flags this returns.
import Anthropic from "@anthropic-ai/sdk";
import { searchVenues } from "./data";

const MAX_CANDIDATES = 8;
const AMENITY_KEYS = ["catering", "parking", "bridalRoom", "dj", "decoration", "kidsArea", "ac", "valet"];

const AI_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          whyItFits: { type: "string", description: "<= 18 words: why this venue suits the couple's budget/guests/event" },
          whatToAsk: { type: "string", description: "<= 18 words: one practical question to ask this venue" },
        },
        required: ["id", "whyItFits", "whatToAsk"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

async function enrichWithClaude(scored, ctx) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || scored.length === 0) return null;

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
  const lang = ctx.locale === "ar" ? "Arabic" : "English";

  // Send only the compact facts the model needs — never private columns.
  const candidates = scored.map((s) => ({
    id: s.venue.id,
    name: s.venue.name,
    type: s.venue.type,
    area: s.venue.area,
    city: s.venue.city,
    capacityMax: s.venue.capacityMax,
    startingPrice: s.venue.startingPrice,
    amenities: AMENITY_KEYS.filter((a) => s.venue[a]),
    fitsBudget: s.fitsBudget,
  }));

  const response = await client.messages.create({
    model,
    max_tokens: 1500,
    output_config: { effort: "low", format: { type: "json_schema", schema: AI_SCHEMA } },
    messages: [
      {
        role: "user",
        content:
          "You are a wedding/event planning concierge for venues in Egypt. " +
          `The couple's request: budget ${ctx.budget || "unspecified"} EGP, ${ctx.guests || "?"} guests, ` +
          `event "${ctx.eventType || "any"}", city "${ctx.city || "any"}", date "${ctx.date || "unspecified"}". ` +
          "For EACH candidate venue below, write whyItFits (≤18 words) and whatToAsk (one practical question, ≤18 words). " +
          "Be concrete — reference price, capacity, or amenities. Never invent facts not present in the data. " +
          `Write BOTH fields in ${lang}. Return exactly one item per candidate id.\n\n` +
          `Candidates: ${JSON.stringify(candidates)}`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block) return null;
  const parsed = JSON.parse(block.text);
  const map = {};
  for (const it of parsed.items || []) {
    if (it && it.id) map[it.id] = { whyItFits: it.whyItFits, whatToAsk: it.whatToAsk };
  }
  return map;
}

export async function planVenues({ budget, guests, city, eventType, date, locale = "en" }) {
  // 1. Candidate pool: city + capacity + event type. NOT budget-filtered, so we
  //    can also surface (and clearly flag) "slightly over budget" options.
  const filters = {};
  if (city) filters.city = city;
  if (guests) filters.capacity = guests;
  if (eventType) filters.suitableFor = eventType;
  const { venues } = await searchVenues({ filters, page: 1, pageSize: 50 });

  // 2. Local market average (of the candidate pool) for the "vs. average" insight.
  const prices = venues.map((v) => Number(v.startingPrice) || 0).filter((p) => p > 0);
  const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const showMarket = prices.length >= 3; // too noisy to claim an "average" below this

  // 3. Deterministic scoring + budget/value flags.
  const scored = venues
    .filter((v) => (guests ? (v.capacityMax || 0) >= guests : true))
    .map((v) => {
      const price = Number(v.startingPrice) || 0;
      const fitsBudget = budget ? price <= budget : true;
      const headroom = budget ? budget - price : null; // negative => over budget
      const vsMarketPct = avg && price ? Math.round(((price - avg) / avg) * 100) : null;

      let score = 50;
      if (budget) score += fitsBudget ? 25 : -30;
      if (guests && v.capacityMax) {
        const ratio = v.capacityMax / guests;
        if (ratio >= 1 && ratio <= 1.5) score += 15;      // right-sized
        else if (ratio > 1.5 && ratio <= 2.5) score += 7; // a little large
      }
      if (vsMarketPct != null && vsMarketPct < 0) score += Math.min(10, Math.round(-vsMarketPct / 5));
      score = Math.max(0, Math.min(100, Math.round(score)));

      return { venue: v, fitsBudget, headroom, vsMarketPct, fitScore: score };
    })
    .sort((a, b) => Number(b.fitsBudget) - Number(a.fitsBudget) || b.fitScore - a.fitScore)
    .slice(0, MAX_CANDIDATES);

  // 4. Optional AI enrichment (best-effort; failures fall back to templated copy).
  let ai = null;
  try {
    ai = await enrichWithClaude(scored, { budget, guests, city, eventType, date, locale });
  } catch (e) {
    console.error("Concierge AI enrich failed:", e.message);
  }

  // 5. Merge public venue fields + concierge insight.
  const results = scored.map((s) => ({
    id: s.venue.id,
    name: s.venue.name,
    type: s.venue.type,
    city: s.venue.city,
    area: s.venue.area,
    capacityMin: s.venue.capacityMin,
    capacityMax: s.venue.capacityMax,
    startingPrice: s.venue.startingPrice,
    indoorOutdoor: s.venue.indoorOutdoor,
    images: s.venue.images,
    rating: s.venue.rating,
    verification_status: s.venue.verification_status,
    concierge: {
      fitsBudget: s.fitsBudget,
      headroom: s.headroom,
      vsMarketPct: showMarket ? s.vsMarketPct : null,
      fitScore: s.fitScore,
      ai: ai?.[s.venue.id] || null,
    },
  }));

  return { results, marketAvg: showMarket ? Math.round(avg) : null, aiEnabled: Boolean(ai) };
}
