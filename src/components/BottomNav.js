"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useI18n } from "@/lib/i18n/client";

const Icon = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]" aria-hidden="true">
    {children}
  </svg>
);
const icons = {
  home: <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></>,
  venues: <><path d="M3 21h18" /><path d="M5 21V9l7-5 7 5v12" /><path d="M10 21v-5h4v5" /></>,
  services: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  support: <><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
};

// Mobile-only bottom tab bar — a simple fixed navbar with labeled icons.
// Home · Venues · Services · Support · Account/Login. Desktop keeps the top navbar.
export default function BottomNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => { if (active) setSignedIn(!!data?.user); });
    return () => { active = false; };
  }, [supabase]);

  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const tabs = [
    { href: "/", label: t.nav.home, icon: icons.home },
    { href: "/venues", label: t.nav.venues, icon: icons.venues },
    { href: "/services", label: t.nav.services, icon: icons.services },
    { href: "/support", label: t.nav.support, icon: icons.support },
    signedIn
      ? { href: "/settings", label: t.nav.account, icon: icons.user }
      : { href: "/login", label: t.nav.login, icon: icons.user },
  ];

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-night/95 backdrop-blur border-t border-hair"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-1 py-2 ${active ? "text-brass" : "text-onnight/60"}`}
              >
                <Icon>{tab.icon}</Icon>
                <span className="text-[10px] font-medium leading-none">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
