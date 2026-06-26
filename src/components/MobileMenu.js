"use client";
import { useState } from "react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

const LINKS = [
  ["/venues", "Venues"],
  ["/search", "AI Search"],
  ["/how-it-works", "How it works"],
  ["/add-venue", "List your venue"],
];

const MORE_LINKS = [
  ["/about", "About"],
  ["/contact", "Contact"],
  ["/terms", "Terms"],
  ["/privacy", "Privacy"],
];

export default function MobileMenu({ userEmail, isAdmin }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="p-2 -mr-2 text-ink"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-x-0 top-16 bottom-0 bg-ink/20 z-30" onClick={close} aria-hidden="true" />
          <div className="fixed inset-x-0 top-16 z-40 bg-ivory border-b border-line shadow-lg">
            <nav className="flex flex-col px-5 py-2">
              {LINKS.map(([href, label]) => (
                <Link key={href} href={href} onClick={close} className="py-3 text-ink/80 border-b border-line/60 hover:text-ink transition">
                  {label}
                </Link>
              ))}
              {isAdmin && (
                <Link href="/admin" onClick={close} className="py-3 text-ink/80 border-b border-line/60 hover:text-ink transition">
                  Admin
                </Link>
              )}
              <div className="flex flex-wrap gap-x-5 gap-y-2 py-3 border-b border-line/60 text-sm text-ink/50">
                {MORE_LINKS.map(([href, label]) => (
                  <Link key={href} href={href} onClick={close} className="hover:text-ink transition">{label}</Link>
                ))}
              </div>
              <div className="py-3">
                {userEmail ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink/50 truncate mr-3">{userEmail}</span>
                    <span className="font-medium text-ink/70 shrink-0" onClick={close}>
                      <LogoutButton />
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link href="/login" onClick={close} className="font-medium text-ink/70 hover:text-ink transition">Log in</Link>
                    <Link href="/signup" onClick={close} className="font-semibold bg-emerald text-ivory px-4 py-2 rounded-full hover:bg-ink transition">
                      Sign up
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
