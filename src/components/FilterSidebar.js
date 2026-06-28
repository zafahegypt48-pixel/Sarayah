"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";

const CITIES = ["Cairo", "Giza", "New Cairo"];
const TYPES = ["Hotel", "Hall", "Garden", "Villa", "Rooftop", "Restaurant"];
const EVENTS = ["Wedding", "Engagement", "Birthday", "Corporate Event"];

export default function FilterSidebar({ filters, onChange }) {
  const { t, tv } = useI18n();
  const [open, setOpen] = useState(false); // mobile collapse state
  function set(key, value) {
    onChange({ ...filters, [key]: value });
  }

  // Count active filters (for the mobile toggle badge).
  const activeCount = Object.values(filters || {}).filter((v) => v !== "" && v != null && v !== false).length;

  return (
    // NOTE: sticky ONLY on lg+. On mobile a sticky aside inside the page grid
    // pins itself over the cards below it — that was the "cards clashing with
    // filters" bug. On mobile it's a normal card the cards sit cleanly below.
    <aside className="relative z-10 bg-surface border border-hair rounded-2xl p-5 lg:space-y-6 lg:sticky lg:top-24 self-start">
      {/* Mobile-only collapse header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="lg:hidden w-full flex items-center justify-between gap-2 text-cream font-semibold"
      >
        <span className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
          {t.filters.title}
          {activeCount > 0 && <span className="text-[11px] font-bold bg-emerald text-onnight rounded-full px-2 py-0.5">{activeCount}</span>}
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" /></svg>
      </button>

      {/* Filter body — always visible on lg, toggled on mobile */}
      <div className={`${open ? "block mt-5" : "hidden"} lg:block space-y-6`}>
      <div>
        <h3 className="text-sm font-semibold text-cream mb-3">{t.filters.cityArea}</h3>
        <select
          value={filters.city || ""}
          onChange={(e) => set("city", e.target.value)}
          className="w-full border border-hair rounded-lg px-3 py-2 text-sm bg-surface"
        >
          <option value="">{t.filters.allCities}</option>
          {CITIES.map((c) => <option key={c} value={c}>{tv("city", c)}</option>)}
        </select>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-cream mb-3">{t.filters.venueType}</h3>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((type) => (
            <button
              key={type}
              onClick={() => set("type", filters.type === type ? "" : type)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                filters.type === type ? "bg-emerald text-onnight border-emerald" : "border-hair text-cream/60 hover:border-emerald/40"
              }`}
            >
              {tv("type", type)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-cream mb-3">{t.filters.setting}</h3>
        <div className="flex gap-2">
          {["Indoor", "Outdoor", "Both"].map((s) => (
            <button
              key={s}
              onClick={() => set("indoorOutdoor", filters.indoorOutdoor === s ? "" : s)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                filters.indoorOutdoor === s ? "bg-emerald text-onnight border-emerald" : "border-hair text-cream/60 hover:border-emerald/40"
              }`}
            >
              {tv("setting", s)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-cream mb-3">{t.filters.minCapacity}</h3>
        <input
          type="number"
          placeholder={t.filters.minCapacityPlaceholder}
          value={filters.capacity || ""}
          onChange={(e) => set("capacity", e.target.value ? Number(e.target.value) : "")}
          className="w-full border border-hair rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-cream mb-3">{t.filters.maxBudget}</h3>
        <input
          type="number"
          placeholder={t.filters.maxBudgetPlaceholder}
          value={filters.budget || ""}
          onChange={(e) => set("budget", e.target.value ? Number(e.target.value) : "")}
          className="w-full border border-hair rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-cream mb-3">{t.filters.suitableFor}</h3>
        <select
          value={filters.suitableFor || ""}
          onChange={(e) => set("suitableFor", e.target.value)}
          className="w-full border border-hair rounded-lg px-3 py-2 text-sm bg-surface"
        >
          <option value="">{t.filters.anyEvent}</option>
          {EVENTS.map((e) => <option key={e} value={e}>{tv("event", e)}</option>)}
        </select>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-cream mb-3">{t.filters.amenities}</h3>
        <div className="space-y-2">
          {[
            ["catering", t.filters.cateringAvailable],
            ["parking", t.filters.parkingAvailable],
            ["dj", t.filters.djSound],
            ["bridalRoom", t.filters.bridalRoom],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-cream/70">
              <input
                type="checkbox"
                checked={!!filters[key]}
                onChange={(e) => set(key, e.target.checked)}
                className="accent-emerald"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={() => onChange({})}
        className="text-xs font-semibold text-cream/40 hover:text-cream underline"
      >
        {t.filters.clearAll}
      </button>
      </div>
    </aside>
  );
}
