"use client";
import { useI18n } from "@/lib/i18n/client";

const CITIES = ["Cairo", "Giza", "New Cairo"];
const TYPES = ["Hotel", "Hall", "Garden", "Villa", "Rooftop", "Restaurant"];
const EVENTS = ["Wedding", "Engagement", "Birthday", "Corporate Event"];

export default function FilterSidebar({ filters, onChange }) {
  const { t, tv } = useI18n();
  function set(key, value) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <aside className="bg-surface border border-hair rounded-2xl p-5 space-y-6 sticky top-24">
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
    </aside>
  );
}
