"use client";
import { useCallback, useEffect, useState } from "react";
import FilterSidebar from "@/components/FilterSidebar";
import VenueCard from "@/components/VenueCard";
import { useI18n } from "@/lib/i18n/client";

const PAGE_SIZE = 12;

// Build the API query string from the active filters + page. Filtering and
// pagination run in the DATABASE (see searchVenues) so we never ship the whole
// table to the browser.
function buildQuery(filters, page) {
  const p = new URLSearchParams();
  if (filters.city) p.set("city", filters.city);
  if (filters.type) p.set("type", filters.type);
  if (filters.indoorOutdoor) p.set("indoorOutdoor", filters.indoorOutdoor);
  if (filters.capacity) p.set("capacity", String(filters.capacity));
  if (filters.budget) p.set("budget", String(filters.budget));
  if (filters.suitableFor) p.set("suitableFor", filters.suitableFor);
  for (const a of ["catering", "parking", "dj", "bridalRoom"]) if (filters[a]) p.set(a, "true");
  p.set("page", String(page));
  p.set("pageSize", String(PAGE_SIZE));
  return p.toString();
}

export default function VenuesPage() {
  const { t } = useI18n();
  const [filters, setFilters] = useState({});
  const [venues, setVenues] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true); // initial / filter-change load
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const fetchPage = useCallback(
    async (pageToLoad, replace) => {
      if (replace) setLoading(true);
      else setLoadingMore(true);
      setError("");
      try {
        const res = await fetch(`/api/venues?${buildQuery(filters, pageToLoad)}`);
        if (!res.ok) throw new Error(t.venues.loadError);
        const data = await res.json();
        const batch = Array.isArray(data.venues) ? data.venues : [];
        setTotal(Number(data.total) || 0);
        setPage(pageToLoad);
        setVenues((prev) => (replace ? batch : [...prev, ...batch]));
      } catch (e) {
        setError(e.message);
      } finally {
        if (replace) setLoading(false);
        else setLoadingMore(false);
      }
    },
    [filters, t.venues.loadError]
  );

  // Re-query from page 1 whenever filters change (debounced for the number inputs).
  useEffect(() => {
    const id = setTimeout(() => fetchPage(1, true), 300);
    return () => clearTimeout(id);
  }, [fetchPage]);

  const hasMore = venues.length < total;
  const countLabel = loading
    ? t.venues.loading
    : total === 1
      ? t.venues.matchOne
      : t.venues.matchMany.replace("{n}", total);

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl text-cream">{t.venues.title}</h1>
        <p className="text-cream/60 mt-1">{countLabel}</p>
      </div>
      <div className="grid lg:grid-cols-[280px_1fr] gap-8 lg:items-start">
        <FilterSidebar filters={filters} onChange={setFilters} />
        <div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 content-start">
            {loading && venues.length === 0 && [...Array(6)].map((_, i) => (
              <div key={i} className="bg-surface border border-hair rounded-2xl overflow-hidden skeleton">
                <div className="h-48 bg-hair/60" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-hair/60 rounded w-3/4" />
                  <div className="h-3 bg-hair/60 rounded w-1/2" />
                  <div className="h-3 bg-hair/60 rounded w-2/3" />
                </div>
              </div>
            ))}
            {!loading && error && (
              <p className="text-red-600 col-span-full text-center py-16">{error}</p>
            )}
            {!error && venues.map((v, i) => (
              <div key={v.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
                <VenueCard venue={v} />
              </div>
            ))}
            {!loading && !error && venues.length === 0 && (
              <p className="text-cream/50 col-span-full text-center py-16">{t.venues.empty}</p>
            )}
          </div>

          {!error && hasMore && (
            <div className="flex justify-center mt-10">
              <button
                onClick={() => fetchPage(page + 1, false)}
                disabled={loadingMore}
                className="bg-surface border border-hair text-cream font-semibold px-7 py-3 rounded-full hover:border-emerald/50 transition disabled:opacity-50"
              >
                {loadingMore ? t.venues.loading : t.venues.loadMore}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
