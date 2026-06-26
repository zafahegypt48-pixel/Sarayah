// Real LLM-powered query parser using Claude via the official Anthropic SDK.
// Falls back to null when ANTHROPIC_API_KEY isn't set, so the caller can use
// the offline regex parser instead (see aiSearch.js).
//
// To enable, add to .env.local (and Vercel):
//   ANTHROPIC_API_KEY = sk-ant-...        (from console.anthropic.com)
//   ANTHROPIC_MODEL   = claude-opus-4-8   (optional; use claude-haiku-4-5 for
//                       a cheaper/faster parse of this simple extraction task)

import Anthropic from "@anthropic-ai/sdk";

// JSON schema for the structured extraction — mirrors the filter shape that
// matchVenues() in aiSearch.js consumes.
const FILTER_SCHEMA = {
  type: "object",
  properties: {
    location: { type: ["string", "null"], description: "City or area, lowercase, e.g. 'new cairo'" },
    indoorOutdoor: { type: ["string", "null"], description: "Exactly 'Indoor' or 'Outdoor', else null" },
    type: { type: ["string", "null"], description: "Venue type lowercase: hotel, hall, garden, villa, rooftop, restaurant" },
    suitableFor: { type: ["string", "null"], description: "One of: Wedding, Engagement, Birthday, Corporate Event" },
    capacity: { type: ["integer", "null"], description: "Number of guests required" },
    budget: { type: ["integer", "null"], description: "Max starting price in EGP" },
    catering: { type: "boolean" },
    parking: { type: "boolean" },
    dj: { type: "boolean" },
    bridalRoom: { type: "boolean" },
    kidsArea: { type: "boolean" },
    valet: { type: "boolean" },
  },
  required: [
    "location", "indoorOutdoor", "type", "suitableFor", "capacity", "budget",
    "catering", "parking", "dj", "bridalRoom", "kidsArea", "valet",
  ],
  additionalProperties: false,
};

export async function parseQueryWithLLM(text) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null; // Not configured — caller falls back to regex parser.

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    // Low effort keeps this simple extraction fast and cheap.
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: FILTER_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content:
          "You extract structured wedding/event venue search filters from a user's " +
          "natural-language query for venues in Egypt. Only set a field if the query " +
          "clearly implies it; otherwise use null (or false for amenities). " +
          `Query: "${text}"`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block) return null;
  return JSON.parse(block.text);
}
