"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";

export default function ContactForm() {
  const { t } = useI18n();
  const tc = t.contactForm;
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const f = e.target;
    const payload = {
      name: f.name.value,
      email: f.email.value,
      phone: f.phone.value,
      inquiry_type: f.inquiry_type.value,
      message: f.message.value,
    };
    // Light client-side checks (server validates too).
    const errs = {};
    if (payload.name.trim().length < 2) errs.name = tc.errName;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) errs.email = tc.errEmail;
    if (payload.message.trim().length < 5) errs.message = tc.errMessage;
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setErrors({});
    setServerError("");
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        if (d.errors) setErrors(d.errors);
        throw new Error(d.error || tc.error);
      }
      setStatus("sent");
      f.reset();
    } catch (err) {
      setStatus("error");
      setServerError(err.message);
    }
  }

  if (status === "sent") {
    return (
      <div className="bg-emerald/10 border border-emerald/30 rounded-2xl p-6 text-center">
        <p className="font-display text-xl text-emerald mb-1">{tc.sentTitle}</p>
        <p className="text-sm text-cream/60">{tc.sentBody}</p>
      </div>
    );
  }

  // inquiry_type values stay English (stored/emailed); only labels are localized.
  const TYPE_VALUES = ["User inquiry", "Venue owner", "Report issue", "Partnership", "Other"];

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 bg-surface border border-hair rounded-2xl p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={tc.name} name="name" error={errors.name} optionalLabel={tc.optional} />
        <Field label={tc.email} name="email" type="email" error={errors.email} optionalLabel={tc.optional} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={tc.phone} name="phone" type="tel" optional optionalLabel={tc.optional} />
        <div>
          <label className="text-sm font-medium text-cream/70 block mb-1.5">{tc.inquiryType}</label>
          <select name="inquiry_type" className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface">
            {TYPE_VALUES.map((val, i) => <option key={val} value={val}>{tc.types[i]}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-cream/70 block mb-1.5">{tc.message}</label>
        <textarea name="message" rows={5} className={`w-full border rounded-lg px-3 py-2.5 text-sm ${errors.message ? "border-red-400" : "border-hair"}`} />
        {errors.message && <p className="text-xs text-red-600 mt-1">{errors.message}</p>}
      </div>
      <button disabled={status === "sending"} className="w-full bg-emerald text-onnight font-semibold py-3 rounded-full hover:opacity-90 transition disabled:opacity-50">
        {status === "sending" ? tc.sending : tc.send}
      </button>
      {status === "error" && <p className="text-sm text-red-600 text-center">{serverError || tc.error}</p>}
    </form>
  );
}

function Field({ label, name, type = "text", error, optional, optionalLabel }) {
  return (
    <div>
      <label className="text-sm font-medium text-cream/70 block mb-1.5">
        {label}{optional && <span className="text-cream/40 font-normal"> {optionalLabel}</span>}
      </label>
      <input name={name} type={type}
        className={`w-full border rounded-lg px-3 py-2.5 text-sm ${error ? "border-red-400" : "border-hair"}`} />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
