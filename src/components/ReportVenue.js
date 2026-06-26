"use client";
import { useState } from "react";

export default function ReportVenue({ venueId }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  async function submit(e) {
    e.preventDefault();
    setStatus("sending");
    const f = e.target;
    try {
      const res = await fetch(`/api/venues/${venueId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: f.reason.value,
          details: f.details.value,
          reporter_contact: f.contact.value,
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return <p className="text-sm text-emerald mt-4">Thanks — we&apos;ve received your report and will review this listing.</p>;
  }

  return (
    <div className="mt-4">
      {!open ? (
        <button onClick={() => setOpen(true)} className="text-xs text-ink/40 hover:text-red-600 underline">
          Report this listing
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-3 border-t border-line pt-4">
          <p className="text-sm font-medium text-ink/70">Report this listing</p>
          <select name="reason" required className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">Reason…</option>
            <option value="fake">Fake or impersonated venue</option>
            <option value="wrong_info">Wrong information</option>
            <option value="not_owner">Listed by someone who isn&apos;t the owner</option>
            <option value="other">Other</option>
          </select>
          <textarea name="details" rows={2} placeholder="Details (optional)" className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
          <input name="contact" placeholder="Your email or phone (optional)" className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button disabled={status === "sending"} className="text-xs font-semibold bg-ink text-ivory px-4 py-2 rounded-full hover:opacity-90 disabled:opacity-50">
              {status === "sending" ? "Sending…" : "Submit report"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-ink/40 hover:text-ink">Cancel</button>
          </div>
          {status === "error" && <p className="text-xs text-red-600">Could not send report. Please try again.</p>}
        </form>
      )}
    </div>
  );
}
