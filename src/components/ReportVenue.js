"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";

export default function ReportVenue({ venueId }) {
  const { t } = useI18n();
  const tr = t.report;
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
    return <p className="text-sm text-emerald mt-4">{tr.sentBody}</p>;
  }

  return (
    <div className="mt-4">
      {!open ? (
        <button onClick={() => setOpen(true)} className="text-xs text-cream/40 hover:text-red-600 underline">
          {tr.open}
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-3 border-t border-hair pt-4">
          <p className="text-sm font-medium text-cream/70">{tr.title}</p>
          <select name="reason" required className="w-full border border-hair rounded-lg px-3 py-2 text-sm bg-surface">
            <option value="">{tr.reasonPlaceholder}</option>
            <option value="fake">{tr.reasons.fake}</option>
            <option value="wrong_info">{tr.reasons.wrong_info}</option>
            <option value="not_owner">{tr.reasons.not_owner}</option>
            <option value="other">{tr.reasons.other}</option>
          </select>
          <textarea name="details" rows={2} placeholder={tr.detailsPlaceholder} className="w-full border border-hair rounded-lg px-3 py-2 text-sm" />
          <input name="contact" placeholder={tr.contactPlaceholder} className="w-full border border-hair rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button disabled={status === "sending"} className="text-xs font-semibold bg-emerald text-onnight px-4 py-2 rounded-full hover:opacity-90 disabled:opacity-50">
              {status === "sending" ? tr.sending : tr.submit}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-cream/40 hover:text-cream">{tr.cancel}</button>
          </div>
          {status === "error" && <p className="text-xs text-red-600">{tr.error}</p>}
        </form>
      )}
    </div>
  );
}
