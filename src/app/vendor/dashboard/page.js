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

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { setState("anon"); return; }
      const [lRes, iRes] = await Promise.all([fetch("/api/vendor/listings"), fetch("/api/vendor/leads")]);
      if (!active) return;
      setListings(lRes.ok ? await lRes.json() : []);
      setLeads(iRes.ok ? await iRes.json() : []);
      setState("ready");
    })();
    return () => { active = false; };
  }, [supabase]);

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
