import Anthropic from "@anthropic-ai/sdk";
import { checkRateLimit, tooManyRequests } from "@/lib/ratelimit";

const SYSTEM =
  "You are Sarayah's friendly support assistant. Sarayah is a bilingual (English/Arabic) " +
  "wedding & event marketplace in Egypt: couples discover venues and vendors " +
  "(photographers, makeup & hair, catering, DJ & zaffa, dresses, flowers, cakes, " +
  "invitations, cars, planners), compare them, and send an inquiry. KEY FACTS: " +
  "Sarayah does NOT process payments or bookings — all arrangements are made directly " +
  "between the user and the vendor. Listings are reviewed by the team before going " +
  "public; listing a business is free during launch. Reviews are moderated. There is " +
  "an AI Budget Concierge at /concierge that builds a shortlist from a budget + guest " +
  "count. A 'Verified' badge means extra proof of ownership was reviewed. " +
  "Answer concisely (2-4 sentences), warmly, and accurately. Never invent policies. " +
  "If you don't know, point them to the Contact page. Reply in the user's language.";

export async function POST(request) {
  const rl = await checkRateLimit(request, { name: "support", limit: 20, windowSeconds: 600 });
  if (!rl.ok) return tooManyRequests();

  const body = await request.json().catch(() => ({}));
  const apiKey = process.env.ANTHROPIC_API_KEY;
  // No key → tell the client to show the FAQ/Contact fallback.
  if (!apiKey) return Response.json({ fallback: true });

  const messages = Array.isArray(body.messages)
    ? body.messages
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
    : [];
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "No message." }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
    const resp = await client.messages.create({ model, max_tokens: 600, system: SYSTEM, messages });
    const block = resp.content.find((b) => b.type === "text");
    return Response.json({ reply: block ? block.text : "" });
  } catch (err) {
    console.error("Support AI failed:", err.message);
    return Response.json({ error: "support_failed" }, { status: 500 });
  }
}
