"use client";
import { useState } from "react";

const TYPES = ["User inquiry", "Venue owner", "Report issue", "Partnership", "Other"];

export default function ContactForm() {
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
    if (payload.name.trim().length < 2) errs.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) errs.email = "Enter a valid email.";
    if (payload.message.trim().length < 5) errs.message = "Please enter a message.";
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
        throw new Error(d.error || "Something went wrong.");
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
        <p className="font-display text-xl text-emerald mb-1">Message sent</p>
        <p className="text-sm text-ink/60">Thanks for reaching out — we&apos;ll get back to you soon.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 bg-white border border-line rounded-2xl p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Your name" name="name" error={errors.name} />
        <Field label="Email" name="email" type="email" error={errors.email} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Phone" name="phone" type="tel" optional />
        <div>
          <label className="text-sm font-medium text-ink/70 block mb-1.5">Inquiry type</label>
          <select name="inquiry_type" className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white">
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-ink/70 block mb-1.5">Message</label>
        <textarea name="message" rows={5} className={`w-full border rounded-lg px-3 py-2.5 text-sm ${errors.message ? "border-red-400" : "border-line"}`} />
        {errors.message && <p className="text-xs text-red-600 mt-1">{errors.message}</p>}
      </div>
      <button disabled={status === "sending"} className="w-full bg-emerald text-ivory font-semibold py-3 rounded-full hover:opacity-90 transition disabled:opacity-50">
        {status === "sending" ? "Sending…" : "Send message"}
      </button>
      {status === "error" && <p className="text-sm text-red-600 text-center">{serverError || "Something went wrong. Please try again."}</p>}
    </form>
  );
}

function Field({ label, name, type = "text", error, optional }) {
  return (
    <div>
      <label className="text-sm font-medium text-ink/70 block mb-1.5">
        {label}{optional && <span className="text-ink/40 font-normal"> (optional)</span>}
      </label>
      <input name={name} type={type}
        className={`w-full border rounded-lg px-3 py-2.5 text-sm ${error ? "border-red-400" : "border-line"}`} />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
