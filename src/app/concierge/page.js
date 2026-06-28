"use client";
import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";

const CITIES = ["Cairo", "Giza", "New Cairo"];
const EVENTS = ["Wedding", "Engagement", "Birthday", "Corporate Event"];
const PLACEHOLDER = "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80";

export default function ConciergePage() {
  const { t, tv, locale } = useI18n();
  const tc = t.concierge;
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [results, setResults] = useState([]);
  const [marketAvg, setMarketAvg] = useState(null);
  const [err, setErr] = useState("");

  const money = (n) => `${Number(n || 0).toLocaleString("en-US")} ${tc.currency}`;

  async function handleSubmit(e) {
    e.preventDefault();
    const f = e.target;
    setErr("");
    setStatus("loading");
    try {
      const res = await fetch("/api/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget: f.budget.value,
          guests: f.guests.value,
          city: f.city.value,
          eventType: f.eventType.value,
          date: f.date.value,
          locale,
        }),
      });
      if (!res.ok) throw new Error(tc.error);
      const data = await res.json();
      setResults(Array.isArray(data.results) ? data.results : []);
      setMarketAvg(data.marketAvg ?? null);
      setStatus("done");
    } catch (e2) {
      setErr(e2.message || tc.error);
      setStatus("error");
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-14">
      <p className="text-brass-deep text-sm font-semibold uppercase tracking-wide mb-2 text-center">{tc.eyebrow}</p>
      <h1 className="font-display text-3xl md:text-4xl text-cream text-center">{tc.title}</h1>
      <p className="text-cream/60 text-center mt-3 max-w-xl mx-auto">{tc.subtitle}</p>

      <form onSubmit={handleSubmit} className="mt-10 bg-surface border border-hair rounded-2xl p-6 grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-cream/70 block mb-1.5">{tc.budget}</label>
          <input name="budget" type="number" min="0" placeholder={tc.budgetPlaceholder}
            className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-cream/70 block mb-1.5">{tc.guests}</label>
          <input name="guests" type="number" min="1" required placeholder={tc.guestsPlaceholder}
            className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-cream/70 block mb-1.5">{tc.city}</label>
          <select name="city" className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface">
            <option value="">{tc.anyCity}</option>
            {CITIES.map((c) => <option key={c} value={c}>{tv("city", c)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-cream/70 block mb-1.5">{tc.eventType}</label>
          <select name="eventType" className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface">
            <option value="">{tc.anyEvent}</option>
            {EVENTS.map((ev) => <option key={ev} value={ev}>{tv("event", ev)}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-cream/70 block mb-1.5">{tc.date}</label>
          <input name="date" type="date" className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface" />
        </div>
        <div className="sm:col-span-2">
          <button disabled={status === "loading"}
            className="w-full bg-emerald text-onnight font-semibold py-3 rounded-full hover:opacity-90 transition disabled:opacity-50">
            {status === "loading" ? tc.thinking : tc.submit}
          </button>
        </div>
      </form>

      {status === "error" && <p className="text-sm text-red-600 text-center mt-6">{err}</p>}

      {status === "done" && (
        <div className="mt-10">
          {results.length === 0 ? (
            <p className="text-center text-cream/50 py-12">{tc.empty}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
                <h2 className="font-display text-2xl text-cream">{tc.resultsTitle.replace("{n}", results.length)}</h2>
                {marketAvg && <p className="text-sm text-cream/50">{tc.marketNote.replace("{avg}", money(marketAvg))}</p>}
              </div>
              <div className="space-y-4">
                {results.map((v, i) => (
                  <ResultCard key={v.id} venue={v} rank={i} tc={tc} tv={tv} money={money} placeholder={PLACEHOLDER} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ResultCard({ venue, rank, tc, tv, money, placeholder }) {
  const c = venue.concierge || {};
  const img = (Array.isArray(venue.images) && venue.images[0]) || placeholder;
  const overBy = c.headroom != null && c.headroom < 0 ? Math.abs(c.headroom) : null;

  // Why/what: AI copy when present, else a localized template from the flags.
  const why = c.ai?.whyItFits || (c.fitsBudget ? tc.fbWhyWithin : overBy != null ? tc.fbWhyOver : tc.fbWhyNoBudget);
  const ask = c.ai?.whatToAsk || tc.fbAsk;

  return (
    <div className="bg-surface border border-hair rounded-2xl overflow-hidden flex flex-col sm:flex-row">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt={venue.name} className="sm:w-48 h-40 sm:h-auto w-full object-cover shrink-0" />
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg text-cream leading-tight">
              {venue.name}
              {venue.verification_status === "verified" && (
                <span className="ms-1.5 align-middle text-xs font-semibold text-blue-700" title={tc.viewVenue}>✓</span>
              )}
            </h3>
            <p className="text-sm text-cream/55 mt-0.5">{tv("type", venue.type)} · {venue.area}, {venue.city}</p>
          </div>
          <div className="text-end shrink-0">
            <p className="font-semibold text-emerald">{money(venue.startingPrice)}</p>
            <p className="text-xs text-cream/50">{venue.capacityMin}–{venue.capacityMax}</p>
          </div>
        </div>

        {/* Insight badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          {rank === 0 && (
            <Badge className="bg-night text-onnight">{tc.topMatch}</Badge>
          )}
          {c.fitsBudget ? (
            <Badge className="bg-emerald/10 text-emerald">✓ {tc.withinBudget}</Badge>
          ) : overBy != null ? (
            <Badge className="bg-amber-100 text-amber-700">{tc.overBudgetBy.replace("{amount}", money(overBy))}</Badge>
          ) : null}
          {c.vsMarketPct != null && c.vsMarketPct < 0 && (
            <Badge className="bg-emerald/10 text-emerald">{tc.belowMarket.replace("{pct}", String(-c.vsMarketPct))}</Badge>
          )}
          {c.vsMarketPct != null && c.vsMarketPct > 0 && (
            <Badge className="bg-amber-100 text-amber-700">{tc.aboveMarket.replace("{pct}", String(c.vsMarketPct))}</Badge>
          )}
          {typeof c.fitScore === "number" && (
            <Badge className="bg-night/5 text-cream/60">{tc.fit.replace("{score}", String(c.fitScore))}</Badge>
          )}
        </div>

        {/* Why it fits / what to ask */}
        <div className="mt-3 grid sm:grid-cols-2 gap-x-5 gap-y-2 text-sm">
          <p className="text-cream/70"><span className="font-semibold text-cream/80">{tc.whyLabel}: </span>{why}</p>
          <p className="text-cream/70"><span className="font-semibold text-cream/80">{tc.askLabel}: </span>{ask}</p>
        </div>

        <div className="mt-4 flex gap-3">
          <Link href={`/venues/${venue.id}`} className="text-sm font-semibold text-emerald hover:text-cream transition">{tc.viewVenue}</Link>
          <Link href={`/venues/${venue.id}`} className="text-sm font-semibold text-cream/60 hover:text-cream transition">{tc.sendInquiry}</Link>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, className = "" }) {
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${className}`}>{children}</span>;
}
