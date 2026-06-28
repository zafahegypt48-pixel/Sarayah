"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "");

export default function Reviews({ listingId, reviews }) {
  const { t } = useI18n();
  const tr = t.reviews;
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");

  async function submit(e) {
    e.preventDefault();
    const f = e.target;
    const payload = { authorName: f.authorName.value, rating, title: f.title.value, body: f.body.value };
    const errs = {};
    if (payload.authorName.trim().length < 2) errs.authorName = tr.errName;
    if (!(rating >= 1 && rating <= 5)) errs.rating = tr.errRating;
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({}); setServerError(""); setStatus("sending");
    try {
      const res = await fetch(`/api/listings/${listingId}/reviews`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        if (d.errors) setErrors(d.errors);
        throw new Error(d.error || tr.error);
      }
      setStatus("sent");
      f.reset();
    } catch (err) {
      setStatus("error");
      setServerError(err.message || tr.error);
    }
  }

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl text-cream">{tr.title}</h2>
        {!open && status !== "sent" && (
          <button onClick={() => setOpen(true)} className="text-sm font-semibold text-emerald hover:text-cream transition">{tr.write}</button>
        )}
      </div>

      {/* Submit form */}
      {open && status !== "sent" && (
        <form onSubmit={submit} noValidate className="bg-surface border border-hair rounded-2xl p-5 mb-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-cream/70 block mb-1.5">{tr.yourName}</label>
              <input name="authorName" className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm" />
              {errors.authorName && <p className="text-xs text-red-600 mt-1">{errors.authorName}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-cream/70 block mb-1.5">{tr.rating}</label>
              <div className="flex gap-1 text-2xl">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n}`}
                    className={n <= rating ? "text-brass" : "text-hair"}>★</button>
                ))}
              </div>
              {errors.rating && <p className="text-xs text-red-600 mt-1">{errors.rating}</p>}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-cream/70 block mb-1.5">{tr.reviewTitle}</label>
            <input name="title" className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-cream/70 block mb-1.5">{tr.yourReview}</label>
            <textarea name="body" rows={3} className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm" />
          </div>
          <div className="flex items-center gap-3">
            <button disabled={status === "sending"} className="bg-emerald text-onnight font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition disabled:opacity-50">
              {status === "sending" ? tr.submitting : tr.submit}
            </button>
            <span className="text-xs text-cream/40">{tr.pendingNote}</span>
          </div>
          {status === "error" && <p className="text-sm text-red-600">{serverError || tr.error}</p>}
        </form>
      )}
      {status === "sent" && (
        <div className="bg-emerald/10 border border-emerald/30 rounded-2xl p-5 mb-6 text-sm text-emerald font-medium">{tr.thanks}</div>
      )}

      {/* Approved reviews */}
      {(!reviews || reviews.length === 0) ? (
        <p className="text-sm text-cream/50">{tr.none}</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="bg-surface border border-hair rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-cream">{r.author_name}</p>
                <span className="text-brass">{"★".repeat(r.rating)}<span className="text-hair">{"★".repeat(5 - r.rating)}</span></span>
              </div>
              {r.title && <p className="font-medium text-cream/80 mt-2">{r.title}</p>}
              {r.body && <p className="text-sm text-cream/70 mt-1 leading-relaxed">{r.body}</p>}
              <p className="text-xs text-cream/40 mt-2">{fmtDate(r.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
