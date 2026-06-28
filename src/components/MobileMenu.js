"use client";
import { useState } from "react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import LanguageToggle from "@/components/LanguageToggle";
import { useI18n } from "@/lib/i18n/client";

export default function MobileMenu({ userEmail, isAdmin }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const LINKS = [
    ["/venues", t.nav.venues],
    ["/services", t.nav.services],
    ["/concierge", `✦ ${t.concierge.nav}`],
    ["/search", t.nav.aiSearch],
    ["/support", t.nav.support],
    ["/how-it-works", t.nav.howItWorks],
    ["/add-venue", t.nav.listVenue],
  ];

  const MORE_LINKS = [
    ["/about", t.footer.about],
    ["/contact", t.footer.contact],
    ["/terms", t.footer.terms],
    ["/privacy", t.footer.privacy],
  ];

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="p-2 -mr-2 text-cream"
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
          <div className="fixed inset-x-0 top-16 bottom-0 bg-night/20 z-30" onClick={close} aria-hidden="true" />
          <div className="fixed inset-x-0 top-16 z-40 bg-canvas border-b border-hair shadow-lg">
            <nav className="flex flex-col px-5 py-2">
              {LINKS.map(([href, label]) => (
                <Link key={href} href={href} onClick={close} className="py-3 text-cream/80 border-b border-hair/60 hover:text-cream transition">
                  {label}
                </Link>
              ))}
              {isAdmin && (
                <Link href="/admin" onClick={close} className="py-3 text-cream/80 border-b border-hair/60 hover:text-cream transition">
                  Admin
                </Link>
              )}
              <div className="flex flex-wrap gap-x-5 gap-y-2 py-3 border-b border-hair/60 text-sm text-cream/50">
                {MORE_LINKS.map(([href, label]) => (
                  <Link key={href} href={href} onClick={close} className="hover:text-cream transition">{label}</Link>
                ))}
              </div>
              <div className="py-3">
                {userEmail ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-cream/50 truncate mr-3">{userEmail}</span>
                    <span className="font-medium text-cream/70 shrink-0" onClick={close}>
                      <LogoutButton />
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link href="/login" onClick={close} className="font-medium text-cream/70 hover:text-cream transition">Log in</Link>
                    <Link href="/signup" onClick={close} className="font-semibold bg-emerald text-onnight px-4 py-2 rounded-full hover:bg-night transition">
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
