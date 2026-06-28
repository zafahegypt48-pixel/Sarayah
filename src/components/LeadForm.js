"use client";
import { useState } from "react";
import { validateLead } from "@/lib/validation";
import { useI18n } from "@/lib/i18n/client";

export default function LeadForm({ venueId, venueName }) {
  const { t } = useI18n();
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");

  // Map a validation error key to a localized message (validateLead returns
  // English keys + messages; we re-localize by key, falling back to the raw
  // message for anything unmapped).
  const msg = (key) => t.lead.errors[key] || errors[key];

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const payload = {
      venueId,
      venueName,
      name: form.name.value,
      phone: form.phone.value,
      email: form.email.value,
      eventDate: form.eventDate.value,
      eventType: form.eventType.value,
      guests: form.guests.value,
      budget: form.budget.value,
      notes: form.notes.value,
    };

    const { valid, errors: validationErrors } = validateLead(payload);
    if (!valid) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setServerError("");
    setStatus("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.errors) setErrors(data.errors);
        throw new Error(data.error || "Request failed");
      }
      setStatus("sent");
      form.reset();
    } catch (err) {
      setStatus("error");
      setServerError(err.message || "Something went wrong.");
    }
  }

  if (status === "sent") {
    return (
      <div className="bg-emerald/10 border border-emerald/30 rounded-2xl p-6 text-center">
        <p className="font-display text-xl text-emerald mb-1">{t.lead.sentTitle}</p>
        <p className="text-sm text-cream/60">
          {t.lead.sentBody.replace("{venue}", venueName)}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t.lead.name} name="name" error={errors.name && msg("name")} />
        <Field label={t.lead.phone} name="phone" type="tel" error={errors.phone && msg("phone")} />
      </div>
      <Field label={t.lead.email} name="email" type="email" error={errors.email && msg("email")} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t.lead.eventDate} name="eventDate" type="date" error={errors.eventDate && msg("eventDate")} />
        <div>
          <label className="text-sm font-medium text-cream/70 block mb-1.5">{t.lead.eventType}</label>
          <select name="eventType" className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-emerald/30">
            <option value="">{t.lead.select}</option>
            <option value="Wedding">{t.enums.event.Wedding}</option>
            <option value="Engagement">{t.enums.event.Engagement}</option>
            <option value="Birthday">{t.enums.event.Birthday}</option>
            <option value="Corporate Event">{t.enums.event["Corporate Event"]}</option>
          </select>
          {errors.eventType && <p className="text-xs text-red-600 mt-1">{msg("eventType")}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t.lead.guests} name="guests" type="number" error={errors.guests && msg("guests")} />
        <Field label={t.lead.budget} name="budget" type="number" error={errors.budget && msg("budget")} optionalLabel={t.lead.optional} />
      </div>
      <div>
        <label className="text-sm font-medium text-cream/70 block mb-1.5">{t.lead.notes}</label>
        <textarea name="notes" rows={3} className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/30" />
        {errors.notes && <p className="text-xs text-red-600 mt-1">{msg("notes")}</p>}
      </div>
      <button
        disabled={status === "sending"}
        className="w-full bg-emerald text-onnight font-semibold py-3 rounded-full hover:opacity-90 transition disabled:opacity-50"
      >
        {status === "sending" ? t.lead.sending : t.lead.send}
      </button>
      {status === "error" && (
        <p className="text-sm text-red-600">{serverError || t.lead.error}</p>
      )}
      <p className="text-xs text-cream/40 text-center">
        {t.lead.footnote}
      </p>
    </form>
  );
}

function Field({ label, name, type = "text", error, optionalLabel }) {
  return (
    <div>
      <label className="text-sm font-medium text-cream/70 block mb-1.5">
        {label}{optionalLabel && <span className="text-cream/40 font-normal"> {optionalLabel}</span>}
      </label>
      <input
        name={name}
        type={type}
        aria-invalid={!!error}
        className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/30 ${
          error ? "border-red-400" : "border-hair"
        }`}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
