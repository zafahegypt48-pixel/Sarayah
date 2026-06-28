"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import VenueCard from "@/components/VenueCard";
import { useI18n } from "@/lib/i18n/client";

function SearchInner() {
  const { t, locale } = useI18n();
  const tsr = t.search;
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [filters, setFilters] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [examples, setExamples] = useState(tsr.examples);

  // Dynamic example suggestions built from the live locations (not hardcoded).
  useEffect(() => {
    let active = true;
    fetch("/api/locations")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active || !d?.governorates?.length) return;
        const ex = d.governorates.slice(0, 3).map((g) => {
          const city = locale === "ar" ? g.name_ar : g.name_en;
          return locale === "ar" ? `مكان فرح في ${city}` : `Wedding venue in ${city}`;
        });
        setExamples(ex);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [locale]);

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

  // Auto-run the search when we arrive with a ?q= (from the home "Ask AI" box or a
  // popular chip) so results appear immediately instead of an idle form.
  const didInit = useRef(false);
  useEffect(() => {
    const initial = params.get("q");
    if (initial && initial.trim() && !didInit.current) {
      didInit.current = true;
      runSearch(initial);
    }
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-4xl mx-auto px-5 py-14">
      <p className="text-brass-deep text-sm font-semibold uppercase tracking-wide mb-2 text-center">{tsr.eyebrow}</p>
      <h1 className="font-display text-3xl md:text-4xl text-cream text-center">
        {tsr.title}
      </h1>

      {/* Back arrow BESIDE the search bar */}
      <div className="mt-8 flex items-center gap-2">
        <Link href="/" aria-label={t.nav.home} title={t.nav.home}
          className="flex items-center justify-center w-11 h-11 rounded-full bg-surface border border-hair text-cream hover:border-emerald/50 transition shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 rtl:-scale-x-100">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 flex items-center gap-2 bg-surface border border-hair rounded-full p-2 ps-5 shadow-sm">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder={tsr.placeholder}
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          <button
            onClick={() => runSearch()}
            className="bg-emerald text-onnight text-sm font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition shrink-0"
          >
            {loading ? tsr.thinking : tsr.button}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => { setQuery(ex); runSearch(ex); }}
            className="text-xs text-cream/50 border border-hair rounded-full px-3 py-1.5 hover:border-emerald/40 hover:text-cream transition"
          >
            {ex}
          </button>
        ))}
      </div>

      {filters && (
        <div className="mt-10">
          <p className="text-xs font-semibold text-cream/40 uppercase tracking-wide mb-2">{tsr.detected}</p>
          <div className="flex flex-wrap gap-2 mb-8">
            {Object.entries(filters).filter(([, v]) => v).map(([k, v]) => (
              <span key={k} className="text-xs bg-emerald/10 text-emerald px-3 py-1.5 rounded-full font-medium">
                {k}: {String(v)}
              </span>
            ))}
            {Object.values(filters).every((v) => !v) && (
              <span className="text-xs text-cream/40">{tsr.noFilters}</span>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {results.map((v) => <VenueCard key={v.id} venue={v} />)}
          </div>
          {results.length === 0 && (
            <p className="text-center text-cream/50 py-12">{tsr.noResults}</p>
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
