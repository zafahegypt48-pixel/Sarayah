import { getVenues } from "@/lib/data";
import { parseQuery, matchVenues, sanitizeFilters } from "@/lib/aiSearch";
import { parseQueryWithLLM } from "@/lib/aiSearchLLM";

export async function POST(request) {
  const { query } = await request.json();
  const text = query || "";

  // Try the real LLM parser first; fall back to the offline regex parser if
  // there's no API key or the call fails for any reason.
  let filters;
  let parsedBy = "rules";
  try {
    const llmFilters = await parseQueryWithLLM(text);
    if (llmFilters) {
      filters = llmFilters;
      parsedBy = "llm";
    }
  } catch (err) {
    console.error("LLM search failed, falling back to rules:", err.message);
  }
  if (!filters) filters = parseQuery(text);

  // Always sanitize — guarantees a safe, well-typed filter shape regardless of
  // whether it came from the LLM or the rule-based parser.
  filters = sanitizeFilters(filters);

  try {
    const venues = await getVenues();
    const results = matchVenues(venues, filters);
    return Response.json({ filters, results, parsedBy });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
