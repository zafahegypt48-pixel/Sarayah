import { planVenues } from "@/lib/concierge";
import { checkRateLimit, tooManyRequests } from "@/lib/ratelimit";

const VALID_EVENTS = ["Wedding", "Engagement", "Birthday", "Corporate Event"];

export const dynamic = "force-dynamic";

export async function POST(request) {
  // Rate-limited: this path can call the Anthropic API, so cap it per IP.
  const rl = await checkRateLimit(request, { name: "concierge", limit: 12, windowSeconds: 600 });
  if (!rl.ok) return tooManyRequests();

  const body = await request.json().catch(() => ({}));
  const budget = Number(body.budget) > 0 ? Math.round(Number(body.budget)) : null;
  const guests = Number(body.guests) > 0 && Number(body.guests) <= 100000 ? Math.round(Number(body.guests)) : null;
  const city = typeof body.city === "string" && body.city.trim() ? body.city.trim().slice(0, 80) : null;
  const eventType = VALID_EVENTS.includes(body.eventType) ? body.eventType : null;
  const date = typeof body.date === "string" ? body.date.slice(0, 20) : null;
  const locale = body.locale === "ar" ? "ar" : "en";

  try {
    const data = await planVenues({ budget, guests, city, eventType, date, locale });
    return Response.json(data);
  } catch (err) {
    console.error("Concierge failed:", err.message);
    return Response.json({ error: "Could not build your plan." }, { status: 500 });
  }
}
