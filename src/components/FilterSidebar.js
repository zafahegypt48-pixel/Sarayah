"use client";

const CITIES = ["Cairo", "Giza", "New Cairo"];
const TYPES = ["Hotel", "Hall", "Garden", "Villa", "Rooftop", "Restaurant"];
const EVENTS = ["Wedding", "Engagement", "Birthday", "Corporate Event"];

export default function FilterSidebar({ filters, onChange }) {
  function set(key, value) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <aside className="bg-white border border-line rounded-2xl p-5 space-y-6 sticky top-24">
      <div>
        <h3 className="text-sm font-semibold text-ink mb-3">City / Area</h3>
        <select
          value={filters.city || ""}
          onChange={(e) => set("city", e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All cities</option>
          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink mb-3">Venue type</h3>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => set("type", filters.type === t ? "" : t)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                filters.type === t ? "bg-emerald text-ivory border-emerald" : "border-line text-ink/60 hover:border-emerald/40"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink mb-3">Setting</h3>
        <div className="flex gap-2">
          {["Indoor", "Outdoor", "Both"].map((s) => (
            <button
              key={s}
              onClick={() => set("indoorOutdoor", filters.indoorOutdoor === s ? "" : s)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                filters.indoorOutdoor === s ? "bg-emerald text-ivory border-emerald" : "border-line text-ink/60 hover:border-emerald/40"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink mb-3">Minimum capacity</h3>
        <input
          type="number"
          placeholder="e.g. 300"
          value={filters.capacity || ""}
          onChange={(e) => set("capacity", e.target.value ? Number(e.target.value) : "")}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink mb-3">Max budget (EGP)</h3>
        <input
          type="number"
          placeholder="e.g. 150000"
          value={filters.budget || ""}
          onChange={(e) => set("budget", e.target.value ? Number(e.target.value) : "")}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink mb-3">Suitable for</h3>
        <select
          value={filters.suitableFor || ""}
          onChange={(e) => set("suitableFor", e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Any event</option>
          {EVENTS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink mb-3">Amenities</h3>
        <div className="space-y-2">
          {[
            ["catering", "Catering available"],
            ["parking", "Parking available"],
            ["dj", "DJ / sound system"],
            ["bridalRoom", "Bridal room"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-ink/70">
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
        className="text-xs font-semibold text-ink/40 hover:text-ink underline"
      >
        Clear all filters
      </button>
    </aside>
  );
}
