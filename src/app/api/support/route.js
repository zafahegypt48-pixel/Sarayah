import Anthropic from "@anthropic-ai/sdk";
import { checkRateLimit, tooManyRequests } from "@/lib/ratelimit";
import { localSupportReply, SUPPORT_SYSTEM_PROMPT } from "@/lib/supportAssistant";

// Provider-independent support endpoint.
// - If a provider key is configured (ANTHROPIC_API_KEY), use the LLM.
// - Otherwise, fall back to the local rule-based assistant so the page still
//   works. Either way the client always receives a usable { reply }.
export async function POST(request) {
  const rl = await checkRateLimit(request, { name: "support", limit: 20, windowSeconds: 600 });
  if (!rl.ok) return tooManyRequests();

  const body = await request.json().catch(() => ({}));
  const locale = body.locale === "ar" ? "ar" : "en";

  const messages = Array.isArray(body.messages)
    ? body.messages
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
    : [];
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "No message." }, { status: 400 });
  }
  const lastUser = messages[messages.length - 1].content;

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // No key → answer locally (rule-based, bilingual). The page stays functional.
  if (!apiKey) {
    return Response.json({ reply: localSupportReply(lastUser, locale), mode: "local" });
  }

  try {
    const client = new Anthropic({ apiKey });
    const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
    const resp = await client.messages.create({
      model,
      max_tokens: 600,
      system: SUPPORT_SYSTEM_PROMPT,
      messages,
    });
    const block = resp.content.find((b) => b.type === "text");
    const reply = block ? block.text : "";
    // Empty AI reply → still give the user something useful.
    return Response.json({ reply: reply || localSupportReply(lastUser, locale), mode: "ai" });
  } catch (err) {
    console.error("Support AI failed, using local fallback:", err.message);
    // On any provider error, degrade gracefully to the local assistant.
    return Response.json({ reply: localSupportReply(lastUser, locale), mode: "local" });
  }
}
