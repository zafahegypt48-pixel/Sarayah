"use client";
import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : "—");

const LEAD_STATUSES = ["new", "contacted", "booked", "closed"];
const LEAD_STATUS_STYLES = {
  new: "bg-emerald/10 text-emerald",
  contacted: "bg-brass/20 text-brass-deep",
  booked: "bg-blue-100 text-blue-700",
  closed: "bg-night/10 text-cream/50",
};

const VENUE_STATUSES = ["pending_review", "approved", "rejected", "suspended"];
const VENUE_STATUS_STYLES = {
  pending_review: "bg-brass/20 text-brass-deep",
  approved: "bg-emerald/10 text-emerald",
  rejected: "bg-red-100 text-red-700",
  suspended: "bg-night/10 text-cream/50",
  verified: "bg-blue-100 text-blue-700",
};

const VENUE_TYPES = ["Hotel", "Hall", "Garden", "Villa", "Rooftop", "Restaurant"];
const SETTINGS = ["Indoor", "Outdoor", "Both"];
const AMENITIES = [
  ["catering", "Catering"], ["parking", "Parking"], ["bridalRoom", "Bridal room"],
  ["dj", "DJ"], ["decoration", "Decoration"], ["kidsArea", "Kids area"],
  ["ac", "AC"], ["valet", "Valet"],
];

export default function AdminPage() {
  const [venues, setVenues] = useState([]);
  const [leads, setLeads] = useState([]);
  const [reports, setReports] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [tab, setTab] = useState("venues");
  const [venueFilter, setVenueFilter] = useState("pending_review");
  const [leadSearch, setLeadSearch] = useState("");
  const [leadStatusFilter, setLeadStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [vRes, lRes, rRes, revRes] = await Promise.all([
        fetch("/api/venues?scope=admin"),
        fetch("/api/leads"),
        fetch("/api/reports"),
        fetch("/api/reviews"),
      ]);
      if (!vRes.ok) throw new Error("Failed to load venues (are you signed in as admin?)");
      if (!lRes.ok) throw new Error("Failed to load leads");
      setVenues(await vRes.json());
      setLeads(await lRes.json());
      setReports(rRes.ok ? await rRes.json() : []);
      setReviews(revRes.ok ? await revRes.json() : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]); // eslint-disable-line react-hooks/set-state-in-effect

  async function patchVenue(id, patch) {
    const res = await fetch(`/api/venues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) { alert("Action failed."); return; }
    const updated = await res.json();
    setVenues((vs) => vs.map((v) => (v.id === id ? updated : v)));
  }

  async function deleteVenue(v) {
    if (!confirm(`Delete "${v.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/venues/${v.id}`, { method: "DELETE" });
    if (res.ok) setVenues((vs) => vs.filter((x) => x.id !== v.id));
    else alert("Could not delete venue.");
  }

  async function patchReview(id, status) {
    const res = await fetch(`/api/reviews/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    if (!res.ok) { alert("Action failed."); return; }
    const updated = await res.json();
    setReviews((rs) => rs.map((r) => (r.id === id ? updated : r)));
  }

  async function updateLeadStatus(id, status) {
    const prev = leads;
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l)));
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    if (!res.ok) { setLeads(prev); alert("Could not update status."); }
  }

  const filteredVenues = venueFilter === "all" ? venues : venues.filter((v) => (v.status || "pending_review") === venueFilter);
  const pendingCount = venues.filter((v) => (v.status || "pending_review") === "pending_review").length;
  const pendingReviews = reviews.filter((r) => (r.status || "pending") === "pending").length;

  const filteredLeads = leads.filter((l) => {
    if (leadStatusFilter !== "all" && (l.status || "new") !== leadStatusFilter) return false;
    if (leadSearch.trim()) {
      const q = leadSearch.toLowerCase();
      const hay = `${l.name || ""} ${l.phone || ""} ${l.email || ""} ${l.venueName || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  function exportLeadsCsv() {
    const cols = ["venueName", "name", "phone", "email", "eventType", "eventDate", "guests", "budget", "status", "notes", "createdAt"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [cols.join(","), ...filteredLeads.map((l) => cols.map((c) => esc(l[c])).join(","))];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hafla-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-3xl text-cream">Admin dashboard</h1>
        <button onClick={loadAll} className="text-sm font-semibold text-emerald hover:text-cream transition">↻ Refresh</button>
      </div>
      <p className="text-cream/60 mb-6">Review submissions, manage venues, and track inquiries.</p>

      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          <Stat label="Pending venues" value={pendingCount} highlight={pendingCount > 0} onClick={() => { setTab("venues"); setVenueFilter("pending_review"); }} />
          <Stat label="Live venues" value={venues.filter((v) => ["approved", "verified"].includes(v.status)).length} />
          <Stat label="New leads" value={leads.filter((l) => (l.status || "new") === "new").length} highlight={leads.some((l) => (l.status || "new") === "new")} onClick={() => setTab("leads")} />
          <Stat label="Open reports" value={reports.length} highlight={reports.length > 0} onClick={() => setTab("reports")} />
          <Stat label="Pending reviews" value={pendingReviews} highlight={pendingReviews > 0} onClick={() => setTab("reviews")} />
        </div>
      )}

      <div className="flex gap-6 border-b border-hair mb-8">
        {[["venues", `Venues (${venues.length})${pendingCount ? ` · ${pendingCount} pending` : ""}`],
          ["leads", `Leads (${leads.length})`],
          ["reports", `Reports (${reports.length})`],
          ["reviews", `Reviews (${reviews.length})${pendingReviews ? ` · ${pendingReviews} pending` : ""}`]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-3 text-sm font-semibold border-b-2 transition ${tab === t ? "border-emerald text-emerald" : "border-transparent text-cream/40 hover:text-cream"}`}>
            {label}
          </button>
        ))}
      </div>

      {loading && <p className="text-cream/50 py-12 text-center">Loading…</p>}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error} <button onClick={loadAll} className="underline font-semibold ml-2">Retry</button>
        </div>
      )}

      {/* ---------------- VENUES ---------------- */}
      {!loading && !error && tab === "venues" && (
        <>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-sm text-cream/50">Filter:</span>
            {["pending_review", "approved", "rejected", "suspended", "all"].map((s) => (
              <button key={s} onClick={() => setVenueFilter(s)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition ${venueFilter === s ? "bg-night text-onnight" : "bg-surface border border-hair text-cream/60 hover:text-cream"}`}>
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
          <p className="text-xs text-cream/40 mb-3">Sorted newest first.</p>
          <div className="bg-surface border border-hair rounded-2xl overflow-x-auto">
            <table className="w-full text-sm min-w-[980px]">
              <thead className="bg-night text-onnight text-xs uppercase">
                <tr>{["Name", "Type", "City", "Source", "Status", "Verified", "Dates", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>))}</tr>
              </thead>
              <tbody>
                {filteredVenues.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-10 text-cream/40">No venues in this view.</td></tr>
                )}
                {filteredVenues.map((v) => {
                  const status = v.status || "pending_review";
                  const verified = v.verification_status === "verified";
                  return (
                    <tr key={v.id} className="border-t border-hair align-middle">
                      <td className="px-4 py-3 font-medium">{v.name}</td>
                      <td className="px-4 py-3">{v.type}</td>
                      <td className="px-4 py-3">{v.city}</td>
                      <td className="px-4 py-3 text-cream/50">{v.source === "whatsapp_outreach" ? "WhatsApp" : "Public"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold rounded-full px-2.5 py-1 capitalize ${VENUE_STATUS_STYLES[status]}`}>
                          {status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {verified ? <span className="text-xs font-semibold text-blue-700">✓ Verified</span> : <span className="text-xs text-cream/40">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-cream/50">
                        <div>{fmtDate(v.created_at)}</div>
                        {v.updated_at && v.updated_at !== v.created_at && (
                          <div className="text-cream/35">upd {fmtDate(v.updated_at)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {status === "pending_review" && (
                          <>
                            <button onClick={() => patchVenue(v.id, { status: "approved" })} className="text-xs font-semibold text-emerald hover:underline mr-2">Approve</button>
                            <button onClick={() => patchVenue(v.id, { status: "rejected" })} className="text-xs font-semibold text-red-600 hover:underline mr-2">Reject</button>
                          </>
                        )}
                        {(status === "approved" || status === "verified") && (
                          <button onClick={() => patchVenue(v.id, { status: "suspended" })} className="text-xs font-semibold text-cream/60 hover:underline mr-2">Suspend</button>
                        )}
                        {(status === "suspended" || status === "rejected") && (
                          <button onClick={() => patchVenue(v.id, { status: "approved" })} className="text-xs font-semibold text-emerald hover:underline mr-2">Re-approve</button>
                        )}
                        <button
                          onClick={() => patchVenue(v.id, { verification_status: verified ? "unverified" : "verified" })}
                          className="text-xs font-semibold text-blue-700 hover:underline mr-2">
                          {verified ? "Unverify" : "Verify"}
                        </button>
                        <button onClick={() => setEditing(v)} className="text-xs font-semibold text-cream/70 hover:underline mr-2">Edit</button>
                        <button onClick={() => deleteVenue(v)} className="text-xs font-semibold text-red-600 hover:underline">Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ---------------- LEADS ---------------- */}
      {!loading && !error && tab === "leads" && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <input
              value={leadSearch}
              onChange={(e) => setLeadSearch(e.target.value)}
              placeholder="Search name, phone, email, venue…"
              className="flex-1 min-w-[200px] border border-hair rounded-lg px-3 py-2 text-sm bg-surface"
            />
            <select value={leadStatusFilter} onChange={(e) => setLeadStatusFilter(e.target.value)}
              className="border border-hair rounded-lg px-3 py-2 text-sm bg-surface">
              <option value="all">All statuses</option>
              {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={exportLeadsCsv} disabled={filteredLeads.length === 0}
              className="text-sm font-semibold bg-emerald text-onnight px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-40">
              Export CSV ({filteredLeads.length})
            </button>
          </div>
        <div className="bg-surface border border-hair rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-night text-onnight text-xs uppercase">
              <tr>{["Venue", "Name", "Phone", "Email", "Event", "Date", "Guests", "Status", "Received"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>))}</tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 && (<tr><td colSpan={9} className="text-center py-10 text-cream/40">No leads match.</td></tr>)}
              {filteredLeads.map((l) => (
                <tr key={l.id} className="border-t border-hair">
                  <td className="px-4 py-3 font-medium">{l.venueName || "—"}</td>
                  <td className="px-4 py-3">{l.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{l.phone}</td>
                  <td className="px-4 py-3">{l.email || "—"}</td>
                  <td className="px-4 py-3">{l.eventType || "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{l.eventDate || "—"}</td>
                  <td className="px-4 py-3">{l.guests ?? "—"}</td>
                  <td className="px-4 py-3">
                    <select value={l.status || "new"} onChange={(e) => updateLeadStatus(l.id, e.target.value)}
                      className={`text-xs font-semibold rounded-full px-2.5 py-1 capitalize border-0 cursor-pointer ${LEAD_STATUS_STYLES[l.status || "new"]}`}>
                      {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-cream/50 whitespace-nowrap text-xs">
                    <div>{fmtDate(l.createdAt)}</div>
                    {l.status_updated_at && (
                      <div className="text-cream/35">status {fmtDate(l.status_updated_at)}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* ---------------- REPORTS ---------------- */}
      {!loading && !error && tab === "reports" && (
        <div className="bg-surface border border-hair rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-night text-onnight text-xs uppercase">
              <tr>{["Venue ID", "Reason", "Details", "Contact", "When"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>))}</tr>
            </thead>
            <tbody>
              {reports.length === 0 && (<tr><td colSpan={5} className="text-center py-10 text-cream/40">No reports.</td></tr>)}
              {reports.map((r) => (
                <tr key={r.id} className="border-t border-hair align-top">
                  <td className="px-4 py-3 font-mono text-xs">{r.venue_id || "—"}</td>
                  <td className="px-4 py-3 capitalize">{(r.reason || "").replace("_", " ")}</td>
                  <td className="px-4 py-3 text-cream/70 max-w-xs">{r.details || "—"}</td>
                  <td className="px-4 py-3">{r.reporter_contact || "—"}</td>
                  <td className="px-4 py-3 text-cream/50 whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-cream/40 p-4">To act on a report, suspend the venue from the Venues tab.</p>
        </div>
      )}

      {/* ---------------- REVIEWS ---------------- */}
      {!loading && !error && tab === "reviews" && (
        <div className="bg-surface border border-hair rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-night text-onnight text-xs uppercase">
              <tr>{["Listing", "Author", "Rating", "Review", "Status", "When", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>))}</tr>
            </thead>
            <tbody>
              {reviews.length === 0 && (<tr><td colSpan={7} className="text-center py-10 text-cream/40">No reviews.</td></tr>)}
              {reviews.map((r) => (
                <tr key={r.id} className="border-t border-hair align-top">
                  <td className="px-4 py-3 font-mono text-xs">{r.listing_id || "—"}</td>
                  <td className="px-4 py-3 font-medium">{r.author_name}</td>
                  <td className="px-4 py-3 text-brass whitespace-nowrap">{"★".repeat(r.rating || 0)}</td>
                  <td className="px-4 py-3 text-cream/70 max-w-xs">
                    {r.title && <div className="font-medium text-cream/80">{r.title}</div>}
                    {r.body || (r.title ? "" : "—")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold rounded-full px-2.5 py-1 capitalize ${
                      r.status === "approved" ? "bg-emerald/10 text-emerald" : r.status === "rejected" ? "bg-red-100 text-red-700" : "bg-brass/20 text-brass-deep"
                    }`}>{r.status || "pending"}</span>
                  </td>
                  <td className="px-4 py-3 text-cream/50 whitespace-nowrap text-xs">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.status !== "approved" && (
                      <button onClick={() => patchReview(r.id, "approved")} className="text-xs font-semibold text-emerald hover:underline mr-2">Approve</button>
                    )}
                    {r.status !== "rejected" && (
                      <button onClick={() => patchReview(r.id, "rejected")} className="text-xs font-semibold text-red-600 hover:underline">Reject</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <VenueEditModal venue={editing} onClose={() => setEditing(null)}
          onSaved={(updated) => { setVenues((vs) => vs.map((x) => (x.id === updated.id ? updated : x))); setEditing(null); }} />
      )}
    </div>
  );
}

const CONTACT_STATUSES = [
  "not_contacted", "contacted", "interested", "needs_follow_up", "registered", "not_interested", "do_not_contact",
];

function VenueEditModal({ venue, onClose, onSaved }) {
  const [form, setForm] = useState({ ...venue });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, val) => setForm((f) => ({ ...f, [k]: val }));

  // Immediate single-field PATCH (used for the contact-status dropdown so
  // last_contacted_at gets stamped only when the status actually changes).
  async function quickPatch(patch) {
    const res = await fetch(`/api/venues/${venue.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });
    if (!res.ok) { alert("Update failed."); return; }
    const updated = await res.json();
    setForm((f) => ({ ...f, ...updated }));
    onSaved(updated);
  }

  async function save() {
    setSaving(true); setErr("");
    const payload = {
      name: form.name, type: form.type, city: form.city, area: form.area,
      indoorOutdoor: form.indoorOutdoor, capacityMin: form.capacityMin, capacityMax: form.capacityMax,
      startingPrice: form.startingPrice, halls: form.halls, venueSize: form.venueSize,
      description: form.description, verification_method: form.verification_method,
      verification_notes: form.verification_notes,
      // contact tracking (owner_* + admin_notes; contact_status handled separately)
      owner_phone: form.owner_phone, owner_whatsapp: form.owner_whatsapp, owner_email: form.owner_email,
      admin_notes: form.admin_notes,
      ...AMENITIES.reduce((a, [k]) => ({ ...a, [k]: !!form[k] }), {}),
    };
    try {
      const res = await fetch(`/api/venues/${venue.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Save failed"); }
      onSaved(await res.json());
    } catch (e) { setErr(e.message); setSaving(false); }
  }

  // Open a private proof doc via a short-lived signed URL (admin session only).
  async function viewDoc(path) {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.storage.from("venue-docs").createSignedUrl(path, 120);
      if (error || !data?.signedUrl) throw error || new Error("no url");
      window.open(data.signedUrl, "_blank", "noopener");
    } catch {
      alert("Could not open document.");
    }
  }

  const waNumber = (form.owner_whatsapp || form.owner_phone || "").replace(/[^\d]/g, "");

  const proof = [
    ["Owner name", form.owner_name], ["Owner role", form.owner_role],
    ["Owner email", form.owner_email], ["Owner phone", form.owner_phone],
    ["Official website", form.official_website], ["Google Maps", form.google_maps_link],
    ["Social link", form.social_link],
  ].filter(([, v]) => v);

  return (
    <div className="fixed inset-0 bg-night/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-canvas rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl text-cream">Edit venue</h2>
          <button onClick={onClose} className="text-cream/40 hover:text-cream text-xl">✕</button>
        </div>

        {(proof.length > 0 || form.authorization_confirmed || (form.verification_docs || []).length > 0) && (
          <div className="bg-surface border border-hair rounded-xl p-4 mb-5">
            <p className="text-xs font-semibold text-cream/50 uppercase tracking-wide mb-2">Submitted contact / proof</p>
            <p className="text-xs mb-2">
              Authorization confirmed:{" "}
              {form.authorization_confirmed
                ? <span className="text-emerald font-semibold">Yes</span>
                : <span className="text-red-600 font-semibold">No</span>}
            </p>
            {proof.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                {proof.map(([label, val]) => (
                  <div key={label}><span className="text-cream/50">{label}: </span><span className="text-cream/80 break-all">{val}</span></div>
                ))}
              </div>
            )}
            {(form.verification_docs || []).length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-cream/50 mb-1">Private verification documents (admin-only):</p>
                <div className="flex flex-wrap gap-2">
                  {(form.verification_docs || []).map((p, i) => (
                    <button key={p} type="button" onClick={() => viewDoc(p)}
                      className="text-xs font-semibold bg-night text-onnight px-3 py-1.5 rounded-full hover:opacity-90">
                      View document {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-cream/40 mt-3">Verify ownership independently (callback to the official public number / business email) before marking Verified.</p>
          </div>
        )}

        <div className="text-xs text-cream/50 mb-5 flex flex-wrap gap-x-5 gap-y-1">
          <span>Submitted: {fmtDateTime(form.created_at)}</span>
          {form.approved_at && <span>Approved: {fmtDateTime(form.approved_at)}</span>}
          {form.rejected_at && <span>Rejected: {fmtDateTime(form.rejected_at)}</span>}
          {form.suspended_at && <span>Suspended: {fmtDateTime(form.suspended_at)}</span>}
          {form.verified_at && <span>Verified: {fmtDateTime(form.verified_at)}</span>}
          {form.updated_at && <span>Last updated: {fmtDateTime(form.updated_at)}</span>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" value={form.name} onChange={(v) => set("name", v)} full />
          <SelectField label="Type" value={form.type} options={VENUE_TYPES} onChange={(v) => set("type", v)} />
          <SelectField label="Setting" value={form.indoorOutdoor} options={SETTINGS} onChange={(v) => set("indoorOutdoor", v)} />
          <Field label="City" value={form.city} onChange={(v) => set("city", v)} />
          <Field label="Area" value={form.area} onChange={(v) => set("area", v)} />
          <Field label="Min capacity" type="number" value={form.capacityMin} onChange={(v) => set("capacityMin", v)} />
          <Field label="Max capacity" type="number" value={form.capacityMax} onChange={(v) => set("capacityMax", v)} />
          <Field label="Starting price (EGP)" type="number" value={form.startingPrice} onChange={(v) => set("startingPrice", v)} />
          <Field label="Halls" type="number" value={form.halls} onChange={(v) => set("halls", v)} />
          <Field label="Venue size (m²)" type="number" value={form.venueSize} onChange={(v) => set("venueSize", v)} />
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-cream/70 block mb-1.5">Description</label>
          <textarea value={form.description || ""} onChange={(e) => set("description", e.target.value)} rows={3}
            className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface" />
        </div>

        {/* Contact & outreach (WhatsApp/phone — no in-app chat) */}
        <div className="border-t border-hair pt-4 mt-5">
          <p className="text-sm font-semibold text-cream/70 mb-3">Contact &amp; outreach</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-cream/70 block mb-1.5">Contact status</label>
              <select
                value={form.contact_status || "not_contacted"}
                onChange={(e) => quickPatch({ contact_status: e.target.value })}
                className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface"
              >
                {CONTACT_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div className="flex items-end text-xs text-cream/50">
              {form.last_contacted_at ? `Last contacted: ${new Date(form.last_contacted_at).toLocaleString()}` : "Not contacted yet"}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <Field label="Owner phone" value={form.owner_phone} onChange={(v) => set("owner_phone", v)} />
            <Field label="Owner WhatsApp" value={form.owner_whatsapp} onChange={(v) => set("owner_whatsapp", v)} />
            <Field label="Owner email" value={form.owner_email} onChange={(v) => set("owner_email", v)} />
          </div>
          <div className="flex gap-2 mt-3">
            <a
              href={waNumber ? `https://wa.me/${waNumber}` : undefined}
              target="_blank" rel="noopener noreferrer"
              className={`text-xs font-semibold px-3 py-2 rounded-full ${waNumber ? "bg-emerald text-onnight hover:opacity-90" : "bg-night/10 text-cream/30 pointer-events-none"}`}
            >WhatsApp</a>
            <a
              href={form.owner_phone ? `tel:${form.owner_phone}` : undefined}
              className={`text-xs font-semibold px-3 py-2 rounded-full ${form.owner_phone ? "bg-night text-onnight hover:opacity-90" : "bg-night/10 text-cream/30 pointer-events-none"}`}
            >Call</a>
            <a
              href={form.owner_email ? `mailto:${form.owner_email}` : undefined}
              className={`text-xs font-semibold px-3 py-2 rounded-full ${form.owner_email ? "bg-brass-deep text-onnight hover:opacity-90" : "bg-night/10 text-cream/30 pointer-events-none"}`}
            >Email</a>
          </div>
          <div className="mt-4">
            <label className="text-sm font-medium text-cream/70 block mb-1.5">Admin notes (internal)</label>
            <textarea value={form.admin_notes || ""} onChange={(e) => set("admin_notes", e.target.value)} rows={2}
              className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <Field label="Verification method" value={form.verification_method} onChange={(v) => set("verification_method", v)} />
          <Field label="Verification notes (internal)" value={form.verification_notes} onChange={(v) => set("verification_notes", v)} />
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-cream/70 block mb-2">Amenities</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {AMENITIES.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-cream/70">
                <input type="checkbox" checked={!!form[key]} onChange={(e) => set(key, e.target.checked)} className="accent-emerald" />
                {label}
              </label>
            ))}
          </div>
        </div>

        {err && <p className="text-sm text-red-600 mt-4">{err}</p>}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-cream/60 hover:text-cream">Cancel</button>
          <button onClick={save} disabled={saving} className="px-6 py-2.5 text-sm font-semibold bg-emerald text-onnight rounded-full hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`text-left rounded-2xl border p-4 transition ${highlight ? "border-emerald/40 bg-emerald/5" : "border-hair bg-surface"} ${onClick ? "hover:border-emerald/60 cursor-pointer" : "cursor-default"}`}
    >
      <div className={`font-display text-2xl ${highlight ? "text-emerald" : "text-cream"}`}>{value}</div>
      <div className="text-xs text-cream/50 mt-0.5">{label}</div>
    </button>
  );
}

function Field({ label, value, onChange, type = "text", full }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="text-sm font-medium text-cream/70 block mb-1.5">{label}</label>
      <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface" />
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <div>
      <label className="text-sm font-medium text-cream/70 block mb-1.5">{label}</label>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}
