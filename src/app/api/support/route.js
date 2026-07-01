import Anthropic from "@anthropic-ai/sdk";
import { checkRateLimit, tooManyRequests } from "@/lib/ratelimit";
import { localSupportReply, AGENT_SYSTEM_PROMPT } from "@/lib/supportAssistant";
import { querySarayahDatabase, ragAnswer } from "@/lib/rag";

// ============================================================================
// Sarayah support — a LOCAL RAG responder (Retrieval-Augmented Generation).
// ============================================================================
// DEFAULT: no external LLM. `ragAnswer` retrieves from Sarayah's own data —
//   • the venue DATABASE (prices, capacity, city, type), and
//   • the KNOWLEDGE BASE (FAQ/policies, EN/AR keyword-scored)
// and composes an answer grounded ONLY in what it retrieved. It never invents
// prices/venues/availability, and works with zero API keys.
//
// OPTIONAL: set SUPPORT_USE_AI=1 (and an ANTHROPIC_API_KEY) to layer a Claude
// agent on top that calls the same RAG as a tool for more natural phrasing.
// This is OFF by default — the RAG answers on its own.
//
// Robust: validates the body, returns clear JSON, replies in EN/AR, never
// crashes, and never exposes secret keys.

const RAG_TOOL = {
  name: "query_sarayah_database",
  description:
    "Search Sarayah's real database of venues and vendors. Use whenever the user asks about " +
    "specific venues, prices, capacity, locations, packages, availability, or recommendations. " +
    "Returns only real listings from the database (never invent data).",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "The user's request in their own words." },
      city: { type: "string", description: "City/area filter, e.g. 'Cairo', 'Giza', 'New Cairo'." },
      type: { type: "string", enum: ["Hotel", "Hall", "Garden", "Villa", "Rooftop", "Restaurant"], description: "Venue type." },
      min_capacity: { type: "number", description: "Minimum guest capacity required." },
      max_budget: { type: "number", description: "Maximum starting price in EGP." },
    },
    required: ["query"],
  },
};

// Reply language from the user's own message (Arabic script → AR).
function detectLocale(text, fallback) {
  if (/[؀-ۿ]/.test(String(text || ""))) return "ar";
  return fallback === "ar" ? "ar" : "en";
}

export async function POST(request) {
  const rl = await checkRateLimit(request, { name: "support", limit: 20, windowSeconds: 600 });
  if (!rl.ok) return tooManyRequests();

  // ---- Validate request body ------------------------------------------------
  const body = await request.json().catch(() => ({}));
  const messages = Array.isArray(body.messages)
    ? body.messages
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
    : [];
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "No message provided." }, { status: 400 });
  }
  const lastUser = messages[messages.length - 1].content;
  const locale = detectLocale(lastUser, body.locale);

  // ---- DEFAULT: local RAG answers on its own (no Claude) ---------------------
  const useAI = process.env.SUPPORT_USE_AI === "1" && !!process.env.ANTHROPIC_API_KEY;
  if (!useAI) {
    try {
      const { reply, mode, usedData } = await ragAnswer(lastUser, locale);
      return Response.json({ reply, mode, usedData });
    } catch (e) {
      console.error("RAG answer failed:", e.message);
      return Response.json({ reply: localSupportReply(lastUser, locale), mode: "local" });
    }
  }

  // ---- OPTIONAL: Claude agent using the same RAG as a tool ------------------
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
    const convo = [...messages];
    let usedData = false;
    let response = await client.messages.create({
      model, max_tokens: 700, system: AGENT_SYSTEM_PROMPT, tools: [RAG_TOOL], messages: convo,
    });

    let rounds = 0;
    while (response.stop_reason === "tool_use" && rounds < 3) {
      rounds += 1;
      convo.push({ role: "assistant", content: response.content });
      const toolResults = [];
      for (const block of response.content) {
        if (block.type === "tool_use" && block.name === "query_sarayah_database") {
          usedData = true;
          let result;
          try { result = await querySarayahDatabase(block.input || {}); }
          catch (e) { console.error("RAG tool failed:", e.message); result = { count: 0, results: [], note: "search_error" }; }
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
        }
      }
      if (!toolResults.length) break;
      convo.push({ role: "user", content: toolResults });
      response = await client.messages.create({
        model, max_tokens: 700, system: AGENT_SYSTEM_PROMPT, tools: [RAG_TOOL], messages: convo,
      });
    }

    const block = response.content.find((b) => b.type === "text");
    const reply = block ? block.text : "";
    if (!reply) {
      const alt = await ragAnswer(lastUser, locale);
      return Response.json({ reply: alt.reply, mode: alt.mode, usedData });
    }
    return Response.json({ reply, mode: "agent", usedData });
  } catch (err) {
    // Claude failed → fall back to the local RAG so the user still gets an answer.
    console.error("Support agent failed, using local RAG:", err.message);
    try {
      const { reply, mode } = await ragAnswer(lastUser, locale);
      return Response.json({ reply, mode });
    } catch {
      return Response.json({ reply: localSupportReply(lastUser, locale), mode: "local" });
    }
  }
}
