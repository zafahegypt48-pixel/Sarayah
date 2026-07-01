"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";

const SEEN_KEY = "sarayah_welcomed";       // permanent: set only when the user PICKS a path
const SNOOZE_KEY = "sarayah_welcome_snooze"; // per-session: set on ✕ / "Maybe later"

// --- Storage-safe helpers -------------------------------------------------
// Some mobile browsers (Safari private mode, locked-down webviews) THROW on
// storage access. We never let that break the modal — reads fail → treat as a
// fresh visitor (better to greet than to silently hide); writes fail → ignore.
//
// Behaviour: the welcome keeps greeting new/returning visitors UNTIL they pick
// "customer" or "owner" (permanent, localStorage). "Maybe later"/✕ only snoozes
// it for the current tab session (sessionStorage), so it returns next visit.
function pickedAlready() {
  try { return window.localStorage.getItem(SEEN_KEY) === "1"; } catch { return false; }
}
function markPicked() {
  try { window.localStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ }
}
function snoozedThisSession() {
  try { return window.sessionStorage.getItem(SNOOZE_KEY) === "1"; } catch { return false; }
}
function snooze() {
  try { window.sessionStorage.setItem(SNOOZE_KEY, "1"); } catch { /* ignore */ }
}
function wantsForce() {
  try { return new URLSearchParams(window.location.search).get("welcome") === "1"; } catch { return false; }
}

// First-visit welcome. Greets the user and routes them by intent:
//   customer → browse venues/vendors    owner → list their venue/business
// Shown once (localStorage), re-openable via ?welcome=1 or a `sarayah:welcome`
// window event (Settings button). Purely client-side — no SSR/backend impact.
export default function WelcomeModal() {
  const { t } = useI18n();
  const w = t.welcome;
  const [show, setShow] = useState(false);

  // Decide visibility AFTER mount (never during render) so there is no
  // hydration mismatch — the server always renders nothing, the client adds it.
  useEffect(() => {
    // A tiny deferral to the next frame guarantees the DOM is painted first,
    // avoiding a rare mobile race where the modal mounts before layout settles.
    let raf = 0;
    const decide = () => {
      // Show unless the user already picked a path, or snoozed it this session.
      if (wantsForce() || (!pickedAlready() && !snoozedThisSession())) setShow(true);
    };
    if (typeof requestAnimationFrame === "function") raf = requestAnimationFrame(decide);
    else decide();

    // Let other UI (Settings "Show welcome" button) re-open it anytime.
    const open = () => setShow(true);
    window.addEventListener("sarayah:welcome", open);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("sarayah:welcome", open);
    };
  }, []);

  // Lock background scroll while open (prevents the mobile bottom-sheet from
  // scrolling the page behind it). Restored on close/unmount.
  useEffect(() => {
    if (!show || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [show]);

  // ✕ / "Maybe later" / backdrop → snooze for this session (returns next visit).
  function snoozeClose() {
    snooze();
    setShow(false);
  }
  // Picking customer/owner → permanent (they engaged; don't greet again).
  function pickAndClose() {
    markPicked();
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-night/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={w.title}
      onClick={snoozeClose}
    >
      {/* dvh (dynamic viewport height) keeps the sheet fully reachable on mobile
          even with the browser toolbar showing. Stop propagation so taps inside
          don't dismiss. */}
      <div
        className="bg-canvas border border-hair w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-6 sm:p-8 max-h-[90dvh] overflow-y-auto animate-modal-in"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-brass-deep text-xs font-semibold uppercase tracking-wide">{w.eyebrow}</p>
          <button onClick={snoozeClose} aria-label={w.skip} className="text-cream/40 hover:text-cream text-xl leading-none -mt-1 p-1">✕</button>
        </div>
        <h2 className="font-display text-2xl text-cream mt-1">{w.title}</h2>
        <p className="text-cream/60 text-sm mt-2">{w.subtitle}</p>

        <div className="grid gap-3 mt-6">
          {/* Customer */}
          <Link href="/venues" onClick={pickAndClose}
            className="group flex items-center gap-4 bg-surface border border-hair rounded-2xl p-4 text-start hover:border-emerald/50 transition active:scale-[0.99]">
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
          <Link href="/add-venue" onClick={pickAndClose}
            className="group flex items-center gap-4 bg-surface border border-hair rounded-2xl p-4 text-start hover:border-brass/60 transition active:scale-[0.99]">
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

        <button onClick={snoozeClose} className="w-full text-center text-sm text-cream/50 hover:text-cream transition mt-5 py-1">
          {w.skip}
        </button>
      </div>
    </div>
  );
}
