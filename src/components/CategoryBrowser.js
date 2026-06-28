"use client";
import { useCallback, useEffect, useState } from "react";
import ListingCard from "@/components/ListingCard";
import { useI18n } from "@/lib/i18n/client";

const PAGE_SIZE = 12;

function buildQuery(category, filters, page) {
  const p = new URLSearchParams();
  p.set("category", category);
  if (filters.governorate) p.set("governorate", filters.governorate);
  if (filters.priceMax) p.set("priceMax", String(filters.priceMax));
  p.set("page", String(page));
  p.set("pageSize", String(PAGE_SIZE));
  return p.toString();
}

// Faceted browse for one category: governorate + max-price filters, DB-paginated,
// "Load more". Mirrors the venues listing but generalized to any category.
export default function CategoryBrowser({ category, categoryObj, governorates, initialGovernorate = "" }) {
  const { t, locale } = useI18n();
  const [filters, setFilters] = useState({ governorate: initialGovernorate || "", priceMax: "" });
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const fetchPage = useCallback(
    async (pageToLoad, replace) => {
      if (replace) setLoading(true);
      else setLoadingMore(true);
      setError("");
      try {
        const res = await fetch(`/api/venues?${buildQuery(category, filters, pageToLoad)}`);
        if (!res.ok) throw new Error(t.venues.loadError);
        const data = await res.json();
        const batch = Array.isArray(data.venues) ? data.venues : [];
        setTotal(Number(data.total) || 0);
        setPage(pageToLoad);
        setListings((prev) => (replace ? batch : [...prev, ...batch]));
      } catch (e) {
        setError(e.message);
      } finally {
        if (replace) setLoading(false);
        else setLoadingMore(false);
      }
    },
    [category, filters, t.venues.loadError]
  );

  useEffect(() => {
    const id = setTimeout(() => fetchPage(1, true), 300);
    return () => clearTimeout(id);
  }, [fetchPage]);

  const hasMore = listings.length < total;
  const countLabel = loading
    ? t.venues.loading
    : total === 1
      ? t.marketplace.oneResult
      : t.marketplace.results.replace("{n}", total);

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          value={filters.governorate}
          onChange={(e) => set("governorate", e.target.value)}
          className="border border-hair rounded-lg px-3 py-2 text-sm bg-surface"
        >
          <option value="">{t.marketplace.allAreas}</option>
          {governorates.map((g) => (
            <option key={g.id} value={g.id}>{locale === "ar" ? g.name_ar : g.name_en}</option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          placeholder={t.marketplace.priceMax}
          value={filters.priceMax}
          onChange={(e) => set("priceMax", e.target.value ? Number(e.target.value) : "")}
          className="border border-hair rounded-lg px-3 py-2 text-sm w-44"
        />
        {(filters.governorate || filters.priceMax) && (
          <button onClick={() => setFilters({ governorate: "", priceMax: "" })} className="text-xs font-semibold text-cream/40 hover:text-cream underline">
            {t.marketplace.clear}
          </button>
        )}
        <span className="text-sm text-cream/50 ms-auto">{countLabel}</span>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 content-start">
        {loading && listings.length === 0 && [...Array(6)].map((_, i) => (
          <div key={i} className="bg-surface border border-hair rounded-2xl overflow-hidden animate-pulse">
            <div className="h-48 bg-hair/60" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-hair/60 rounded w-3/4" />
              <div className="h-3 bg-hair/60 rounded w-1/2" />
            </div>
          </div>
        ))}
        {!loading && error && <p className="text-red-600 col-span-full text-center py-16">{error}</p>}
        {!error && listings.map((l) => <ListingCard key={l.id} listing={l} category={categoryObj} />)}
        {!loading && !error && listings.length === 0 && (
          <p className="text-cream/50 col-span-full text-center py-16">{t.marketplace.noResults}</p>
        )}
      </div>

      {!error && hasMore && (
        <div className="flex justify-center mt-10">
          <button
            onClick={() => fetchPage(page + 1, false)}
            disabled={loadingMore}
            className="bg-surface border border-hair text-cream font-semibold px-7 py-3 rounded-full hover:border-emerald/50 transition disabled:opacity-50"
          >
            {loadingMore ? t.venues.loading : t.marketplace.loadMore}
          </button>
        </div>
      )}
    </div>
  );
}
