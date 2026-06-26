"use client";
import { useState } from "react";
import { validateLead } from "@/lib/validation";

export default function LeadForm({ venueId, venueName }) {
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");

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
        <p className="font-display text-xl text-emerald mb-1">Inquiry sent</p>
        <p className="text-sm text-ink/60">
          {venueName} will receive your details and get back to you. You won&apos;t be contacted directly until then.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Your name" name="name" error={errors.name} />
        <Field label="Phone number" name="phone" type="tel" error={errors.phone} />
      </div>
      <Field label="Email" name="email" type="email" error={errors.email} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Event date" name="eventDate" type="date" error={errors.eventDate} />
        <div>
          <label className="text-sm font-medium text-ink/70 block mb-1.5">Event type</label>
          <select name="eventType" className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald/30">
            <option value="">Select</option>
            <option>Wedding</option>
            <option>Engagement</option>
            <option>Birthday</option>
            <option>Corporate Event</option>
          </select>
          {errors.eventType && <p className="text-xs text-red-600 mt-1">{errors.eventType}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Number of guests" name="guests" type="number" error={errors.guests} />
        <Field label="Budget (EGP)" name="budget" type="number" error={errors.budget} optional />
      </div>
      <div>
        <label className="text-sm font-medium text-ink/70 block mb-1.5">Notes (optional)</label>
        <textarea name="notes" rows={3} className="w-full border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/30" />
        {errors.notes && <p className="text-xs text-red-600 mt-1">{errors.notes}</p>}
      </div>
      <button
        disabled={status === "sending"}
        className="w-full bg-emerald text-ivory font-semibold py-3 rounded-full hover:opacity-90 transition disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : "Send inquiry to venue"}
      </button>
      {status === "error" && (
        <p className="text-sm text-red-600">{serverError || "Something went wrong. Please try again."}</p>
      )}
      <p className="text-xs text-ink/40 text-center">
        We pass your details to the venue — they will contact you directly to confirm availability.
      </p>
    </form>
  );
}

function Field({ label, name, type = "text", error, optional }) {
  return (
    <div>
      <label className="text-sm font-medium text-ink/70 block mb-1.5">
        {label}{optional && <span className="text-ink/40 font-normal"> (optional)</span>}
      </label>
      <input
        name={name}
        type={type}
        aria-invalid={!!error}
        className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/30 ${
          error ? "border-red-400" : "border-line"
        }`}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
