"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import VenueCard from "@/components/VenueCard";

const EXAMPLES = [
  "Outdoor wedding venue in New Cairo for 300 people with catering and parking",
  "Indoor hotel ballroom in Zamalek under 200k for a wedding",
  "Rooftop for an engagement party in Maadi with DJ",
];

function SearchInner() {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [filters, setFilters] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  async function runSearch(q) {
    const text = q ?? query;
    if (!text.trim()) return;
    setLoading(true);
    const res = await fetch("/api/ai-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: text }),
    });
    const data = await res.json();
    setFilters(data.filters);
    setResults(data.results);
    setLoading(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-14">
      <p className="text-brass-deep text-sm font-semibold uppercase tracking-wide mb-2 text-center">AI Search Assistant</p>
      <h1 className="font-display text-3xl md:text-4xl text-ink text-center">
        Describe the venue you need, in your own words.
      </h1>

      <div className="mt-8 flex items-center gap-2 bg-white border border-line rounded-full p-2 pl-5 shadow-sm">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          placeholder='e.g. "outdoor wedding venue in New Cairo for 300 people with catering and parking"'
          className="flex-1 bg-transparent text-sm focus:outline-none"
        />
        <button
          onClick={() => runSearch()}
          className="bg-emerald text-ivory text-sm font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition shrink-0"
        >
          {loading ? "Thinking…" : "Search"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => { setQuery(ex); runSearch(ex); }}
            className="text-xs text-ink/50 border border-line rounded-full px-3 py-1.5 hover:border-emerald/40 hover:text-ink transition"
          >
            {ex}
          </button>
        ))}
      </div>

      {filters && (
        <div className="mt-10">
          <p className="text-xs font-semibold text-ink/40 uppercase tracking-wide mb-2">Filters detected from your text</p>
          <div className="flex flex-wrap gap-2 mb-8">
            {Object.entries(filters).filter(([, v]) => v).map(([k, v]) => (
              <span key={k} className="text-xs bg-emerald/10 text-emerald px-3 py-1.5 rounded-full font-medium">
                {k}: {String(v)}
              </span>
            ))}
            {Object.values(filters).every((v) => !v) && (
              <span className="text-xs text-ink/40">No specific filters detected — showing broad matches.</span>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {results.map((v) => <VenueCard key={v.id} venue={v} />)}
          </div>
          {results.length === 0 && (
            <p className="text-center text-ink/50 py-12">No venues matched exactly — try a broader description.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  );
}
