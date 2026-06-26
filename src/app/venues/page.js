"use client";
import { useEffect, useState } from "react";
import FilterSidebar from "@/components/FilterSidebar";
import VenueCard from "@/components/VenueCard";

export default function VenuesPage() {
  const [venues, setVenues] = useState([]);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/venues");
        if (!res.ok) throw new Error("Failed to load venues");
        const data = await res.json();
        if (active) setVenues(Array.isArray(data) ? data : []);
      } catch (e) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const filtered = venues.filter((v) => {
    if (filters.city && v.city !== filters.city) return false;
    if (filters.type && v.type !== filters.type) return false;
    if (filters.indoorOutdoor && v.indoorOutdoor !== filters.indoorOutdoor && v.indoorOutdoor !== "Both") return false;
    if (filters.capacity && v.capacityMax < filters.capacity) return false;
    if (filters.budget && v.startingPrice > filters.budget) return false;
    if (filters.suitableFor && !(v.suitableFor || []).includes(filters.suitableFor)) return false;
    if (filters.catering && !v.catering) return false;
    if (filters.parking && !v.parking) return false;
    if (filters.dj && !v.dj) return false;
    if (filters.bridalRoom && !v.bridalRoom) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl text-ink">Browse venues</h1>
        <p className="text-ink/60 mt-1">
          {loading ? "Loading venues…" : `${filtered.length} venue${filtered.length !== 1 ? "s" : ""} match your filters`}
        </p>
      </div>
      <div className="grid lg:grid-cols-[280px_1fr] gap-8">
        <FilterSidebar filters={filters} onChange={setFilters} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 content-start">
          {loading && [...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-line rounded-2xl overflow-hidden animate-pulse">
              <div className="h-48 bg-line/60" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-line/60 rounded w-3/4" />
                <div className="h-3 bg-line/60 rounded w-1/2" />
                <div className="h-3 bg-line/60 rounded w-2/3" />
              </div>
            </div>
          ))}
          {!loading && error && (
            <p className="text-red-600 col-span-full text-center py-16">{error}</p>
          )}
          {!loading && !error && filtered.map((v) => <VenueCard key={v.id} venue={v} />)}
          {!loading && !error && filtered.length === 0 && (
            <p className="text-ink/50 col-span-full text-center py-16">No venues match these filters yet — try widening your search.</p>
          )}
        </div>
      </div>
    </div>
  );
}
