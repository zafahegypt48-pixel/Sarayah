"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useI18n } from "@/lib/i18n/client";
import { buildNotifications, getReadIds, saveReadIds } from "@/lib/notifications";

// Top-bar actions: dynamic Notifications (built from real state, with persistent
// read/unread tracking) + a Settings gear that links to the full /settings page.
export default function HeaderActions() {
  const { t } = useI18n();
  const tn = t.notifications;
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [readIds, setReadIds] = useState(() => new Set());

  // Resolve auth (changes which notifications appear) + load read state.
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => { if (active) setSignedIn(!!data?.user); });
    setReadIds(getReadIds()); // eslint-disable-line react-hooks/set-state-in-effect
    return () => { active = false; };
  }, [supabase]);

  const items = useMemo(() => buildNotifications(t, { signedIn }), [t, signedIn]);
  const unread = items.filter((i) => !readIds.has(i.id)).length;

  function markAll() {
    const next = new Set(items.map((i) => i.id));
    setReadIds(next);
    saveReadIds(next);
  }
  function markRead(id) {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  }

  return (
    <>
      {/* Notifications */}
      <div className="relative">
        <button type="button" aria-label={tn.aria} title={tn.aria}
          onClick={() => setOpen((o) => !o)}
          className="relative p-2 text-cream/70 hover:text-cream transition">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          {unread > 0 && (
            <span className="absolute -top-0.5 -end-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold bg-brass text-night rounded-full ring-2 ring-canvas">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
            <div className="absolute end-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-canvas border border-hair rounded-2xl shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-hair flex items-center justify-between gap-2">
                <span className="font-semibold text-cream text-sm">
                  {tn.title}
                  {unread > 0 && <span className="ms-2 text-xs font-medium text-brass">{tn.unread.replace("{n}", String(unread))}</span>}
                </span>
                {unread > 0
                  ? <button onClick={markAll} className="text-xs text-emerald hover:text-cream transition shrink-0">{tn.markAll}</button>
                  : <button onClick={() => setOpen(false)} aria-label="Close" className="text-cream/40 hover:text-cream">✕</button>}
              </div>
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-cream/50">{tn.empty}</p>
              ) : (
                <ul className="max-h-80 overflow-y-auto divide-y divide-hair">
                  {items.map((it) => {
                    const isUnread = !readIds.has(it.id);
                    return (
                      <li key={it.id}>
                        <Link href={it.href} onClick={() => { markRead(it.id); setOpen(false); }}
                          className={`block px-4 py-3 transition hover:bg-surface ${isUnread ? "bg-emerald/5" : ""}`}>
                          <p className="text-sm font-medium text-cream flex items-center gap-2">
                            {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-brass shrink-0" />}
                            {it.title}
                          </p>
                          <p className="text-xs text-cream/55 mt-0.5 ms-0">{it.body}</p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      {/* Settings → full page (proper gear/cog icon) */}
      <Link href="/settings" aria-label={t.settings.aria} title={t.settings.aria}
        className="p-2 text-cream/70 hover:text-cream transition">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </Link>
    </>
  );
}
