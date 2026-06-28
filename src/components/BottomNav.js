"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";

const Icon = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
    {children}
  </svg>
);
const icons = {
  home: <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></>,
  venues: <><path d="M3 21h18" /><path d="M5 21V9l7-5 7 5v12" /><path d="M10 21v-5h4v5" /></>,
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
  heart: <path d="M20.8 8.6a5 5 0 0 0-8.8-3.2A5 5 0 0 0 3.2 8.6c0 4.2 8.8 9.4 8.8 9.4s8.8-5.2 8.8-9.4z" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
};

// Mobile-only bottom tab bar. The center "AI Planner" tab is an elevated gold
// circle — Sarayah's wedge gets pride of place. Desktop keeps the top navbar.
export default function BottomNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const tabs = [
    { href: "/", label: t.nav.home, icon: icons.home },
    { href: "/venues", label: t.nav.venues, icon: icons.venues },
    { href: "/concierge", label: t.concierge.nav, icon: icons.sparkle, center: true },
    { href: "/favorites", label: t.fav.nav, icon: icons.heart },
    { href: "/login", label: t.nav.login, icon: icons.user },
  ];

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-night/95 backdrop-blur border-t border-hair"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5 items-end">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          if (tab.center) {
            return (
              <li key={tab.href} className="flex justify-center">
                <Link href={tab.href} className="flex flex-col items-center -mt-5">
                  <span className="flex items-center justify-center w-12 h-12 rounded-full bg-brass text-night shadow-lg shadow-brass/30 ring-4 ring-night">
                    <Icon>{tab.icon}</Icon>
                  </span>
                  <span className={`text-[10px] mt-1 font-semibold ${active ? "text-brass" : "text-onnight/60"}`}>{tab.label}</span>
                </Link>
              </li>
            );
          }
          return (
            <li key={tab.href}>
              <Link href={tab.href} className={`flex flex-col items-center gap-1 py-2.5 ${active ? "text-brass" : "text-onnight/55"}`}>
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
