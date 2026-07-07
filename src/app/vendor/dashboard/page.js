"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useI18n } from "@/lib/i18n/client";

const STATUS_STYLE = {
  pending_review: "bg-brass/20 text-brass-deep",
  approved: "bg-emerald/10 text-emerald",
  verified: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
  suspended: "bg-night/10 text-cream/50",
};

export default function VendorDashboard() {
  const { t } = useI18n();
  const tvd = t.vendor;
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [state, setState] = useState("loading"); // loading | anon | ready
  const [listings, setListings] = useState([]);
  const [leads, setLeads] = useState([]);
  const [claims, setClaims] = useState([]);
  const [claimIdent, setClaimIdent] = useState("");
  const [claimMsg, setClaimMsg] = useState({ kind: "", text: "" });
  const [claimBusy, setClaimBusy] = useState(false);

  // Load (re-usable so we can refresh after a successful claim).
  const load = useMemo(() => async () => {
    const [lRes, iRes, cRes] = await Promise.all([
      fetch("/api/vendor/listings"),
      fetch("/api/vendor/leads"),
      fetch("/api/vendor/claim"),
    ]);
    setListings(lRes.ok ? await lRes.json() : []);
    setLeads(iRes.ok ? await iRes.json() : []);
    setClaims(cRes.ok ? await cRes.json() : []);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { setState("anon"); return; }
      await load();
      if (!active) return;
      setState("ready");
    })();
    return () => { active = false; };
  }, [supabase, load]);

  async function submitClaim(e) {
    e.preventDefault();
    const ident = claimIdent.trim();
    if (!ident || claimBusy) return;
    setClaimBusy(true);
    setClaimMsg({ kind: "", text: "" });
    try {
      const res = await fetch("/api/vendor/claim", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ident }),
      });
      const data = await res.json().catch(() => ({}));
      const map = {
        claimed: { kind: "ok", text: tvd.claimClaimed },
        pending: { kind: "ok", text: tvd.claimPending },
        error: {
          already_claimed: tvd.claimAlready,
          not_found: tvd.claimNotFound,
          not_a_vendor: tvd.claimNotVendor,
          not_authenticated: tvd.claimNotVendor,
        },
      };
      if (data.status === "claimed" || data.status === "pending") {
        setClaimMsg(map[data.status]);
        setClaimIdent("");
        await load(); // reflect the new listing / pending claim
      } else {
        const reasonText = (data.status === "error" && map.error[data.reason]) || tvd.claimError;
        setClaimMsg({ kind: "err", text: reasonText });
      }
    } catch {
      setClaimMsg({ kind: "err", text: tvd.claimError });
    } finally {
      setClaimBusy(false);
    }
  }

  if (state === "loading") return <div className="max-w-5xl mx-auto px-5 py-16 text-cream/50">…</div>;

  if (state === "anon") {
    return (
      <div className="max-w-5xl mx-auto px-5 py-16 text-center">
        <h1 className="font-display text-3xl text-cream mb-3">{tvd.dashboard}</h1>
        <p className="text-cream/60 mb-6">{tvd.loginPrompt}</p>
        <Link href="/login?next=/vendor/dashboard" className="inline-block bg-emerald text-onnight font-semibold px-6 py-3 rounded-full hover:opacity-90 transition">{t.nav.login}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-3xl text-cream">{tvd.dashboard}</h1>
        <Link href="/add-venue" className="bg-emerald text-onnight font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition text-sm">{tvd.addListing}</Link>
      </div>
      <p className="text-cream/60 mb-8">{tvd.subtitle}</p>

      {/* Claim an existing listing */}
      <div className="bg-surface border border-hair rounded-2xl p-5 mb-10">
        <h2 className="font-display text-lg text-cream mb-1">{tvd.claimTitle}</h2>
        <p className="text-cream/55 text-sm mb-4">{tvd.claimHint}</p>
        <form onSubmit={submitClaim} className="flex flex-col sm:flex-row gap-2">
          <input
            value={claimIdent}
            onChange={(e) => setClaimIdent(e.target.value)}
            placeholder={tvd.claimPlaceholder}
            className="flex-1 border border-hair rounded-lg px-3 py-2.5 text-sm"
          />
          <button
            disabled={claimBusy || !claimIdent.trim()}
            className="btn-shine bg-emerald text-onnight font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition active:scale-[0.98] disabled:opacity-50 shrink-0"
          >
            {claimBusy ? tvd.claimBusyLabel : tvd.claimButton}
          </button>
        </form>
        {claimMsg.text && (
          <p className={`text-sm mt-3 ${claimMsg.kind === "err" ? "text-red-600" : "text-emerald"}`}>{claimMsg.text}</p>
        )}
        {claims.filter((c) => c.status === "pending").length > 0 && (
          <div className="mt-4 pt-4 border-t border-hair">
            <p className="text-xs font-semibold uppercase tracking-wide text-cream/40 mb-2">{tvd.claimsPending}</p>
            <ul className="space-y-1">
              {claims.filter((c) => c.status === "pending").map((c) => (
                <li key={c.id} className="text-sm text-cream/70 flex items-center justify-between gap-2">
                  <span>{c.venue_name}</span>
                  <span className="text-xs text-brass-deep">{tvd.claimStatusPending}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* My listings */}
      <h2 className="font-display text-xl text-cream mb-3">{tvd.myListings} ({listings.length})</h2>
      <div className="bg-surface border border-hair rounded-2xl overflow-x-auto mb-10">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="bg-night text-onnight text-xs uppercase">
            <tr>{[tvd.listing, tvd.status, ""].map((h, i) => <th key={i} className="text-left px-4 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {listings.length === 0 && <tr><td colSpan={3} className="text-center py-10 text-cream/40">{tvd.noListings}</td></tr>}
            {listings.map((l) => {
              const status = l.status || "pending_review";
              return (
                <tr key={l.id} className="border-t border-hair">
                  <td className="px-4 py-3 font-medium">{l.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold rounded-full px-2.5 py-1 capitalize ${STATUS_STYLE[status] || ""}`}>{status.replace("_", " ")}</span>
                  </td>
                  <td className="px-4 py-3">
                    {(status === "approved" || status === "verified") && (
                      <Link href={`/listing/${l.slug || l.id}`} className="text-xs font-semibold text-emerald hover:underline">{tvd.view}</Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Inquiries */}
      <h2 className="font-display text-xl text-cream mb-3">{tvd.inquiries} ({leads.length})</h2>
      <div className="bg-surface border border-hair rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-night text-onnight text-xs uppercase">
            <tr>{["Venue", "Name", "Phone", "Event", "Date", "Guests"].map((h) => <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {leads.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-cream/40">{tvd.noInquiries}</td></tr>}
            {leads.map((l) => (
              <tr key={l.id} className="border-t border-hair">
                <td className="px-4 py-3 font-medium">{l.venueName || "—"}</td>
                <td className="px-4 py-3">{l.name}</td>
                <td className="px-4 py-3 whitespace-nowrap">{l.phone}</td>
                <td className="px-4 py-3">{l.eventType || "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">{l.eventDate || "—"}</td>
                <td className="px-4 py-3">{l.guests ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
