"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";

const SEEN_KEY = "sarayah_welcomed";

// First-visit welcome. Greets the user and routes them by intent:
//   customer  → browse venues/vendors
//   owner     → list their venue/business
// Shown once, then remembered in localStorage. Purely client-side, so it never
// affects SSR or the backend.
export default function WelcomeModal() {
  const { t } = useI18n();
  const w = t.welcome;
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen = true;
    try { seen = localStorage.getItem(SEEN_KEY) === "1"; } catch { seen = false; }
    if (!seen) setShow(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  function dismiss() {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-night/60 backdrop-blur-sm p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={w.title}>
      <div className="bg-canvas border border-hair w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <p className="text-brass-deep text-xs font-semibold uppercase tracking-wide">{w.eyebrow}</p>
          <button onClick={dismiss} aria-label={w.skip} className="text-cream/40 hover:text-cream text-xl leading-none -mt-1">✕</button>
        </div>
        <h2 className="font-display text-2xl text-cream mt-1">{w.title}</h2>
        <p className="text-cream/60 text-sm mt-2">{w.subtitle}</p>

        <div className="grid gap-3 mt-6">
          {/* Customer */}
          <Link href="/venues" onClick={dismiss}
            className="group flex items-center gap-4 bg-surface border border-hair rounded-2xl p-4 text-start hover:border-emerald/50 transition">
            <span className="flex items-center justify-center w-11 h-11 rounded-full bg-emerald/10 text-emerald shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
            </span>
            <span className="flex-1">
              <span className="block font-semibold text-cream">{w.customer}</span>
              <span className="block text-xs text-cream/55 mt-0.5">{w.customerDesc}</span>
            </span>
            <span className="text-cream/30 group-hover:text-emerald transition rtl:-scale-x-100">›</span>
          </Link>

          {/* Venue owner / vendor */}
          <Link href="/add-venue" onClick={dismiss}
            className="group flex items-center gap-4 bg-surface border border-hair rounded-2xl p-4 text-start hover:border-brass/60 transition">
            <span className="flex items-center justify-center w-11 h-11 rounded-full bg-brass/15 text-brass shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M3 21h18" /><path d="M5 21V9l7-5 7 5v12" /><path d="M10 21v-5h4v5" /></svg>
            </span>
            <span className="flex-1">
              <span className="block font-semibold text-cream">{w.owner}</span>
              <span className="block text-xs text-cream/55 mt-0.5">{w.ownerDesc}</span>
            </span>
            <span className="text-cream/30 group-hover:text-brass transition rtl:-scale-x-100">›</span>
          </Link>
        </div>

        <button onClick={dismiss} className="w-full text-center text-sm text-cream/50 hover:text-cream transition mt-5">
          {w.skip}
        </button>
      </div>
    </div>
  );
}
