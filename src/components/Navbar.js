import Link from "next/link";
import { getCurrentUser, isAdminEmail } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import MobileMenu from "@/components/MobileMenu";
import LanguageToggle from "@/components/LanguageToggle";
import HeaderActions from "@/components/HeaderActions";
import Wordmark from "@/components/Wordmark";
import { getI18n } from "@/lib/i18n/server";

export default async function Navbar() {
  const user = await getCurrentUser();
  const admin = user && isAdminEmail(user.email);
  const { t } = await getI18n();

  return (
    <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur border-b border-hair">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/" aria-label={t.nav.homeAria}>
          <Wordmark className="text-2xl text-cream" />
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-cream/70">
          <Link href="/venues" className="hover:text-cream transition">{t.nav.venues}</Link>
          <Link href="/concierge" className="text-emerald hover:text-cream transition font-semibold">✦ {t.concierge.nav}</Link>
          <Link href="/search" className="hover:text-cream transition">{t.nav.aiSearch}</Link>
          <Link href="/how-it-works" className="hover:text-cream transition">{t.nav.howItWorks}</Link>
          <Link href="/add-venue" className="hover:text-cream transition">{t.nav.listVenue}</Link>
          {admin && <Link href="/admin" className="hover:text-cream transition">{t.nav.admin}</Link>}
        </nav>
        {/* Right cluster: desktop auth + settings/support + menu */}
        <div className="flex items-center gap-1.5">
        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-3 text-sm">
          <LanguageToggle />
          {user ? (
            <>
              <Link href="/vendor/dashboard" className="font-medium text-cream/70 hover:text-cream transition">{t.vendor.nav}</Link>
              <span className="text-cream/50">{user.email}</span>
              <span className="font-medium text-cream/70">
                <LogoutButton />
              </span>
            </>
          ) : (
            <>
              <Link href="/login" className="font-medium text-cream/70 hover:text-cream transition">{t.nav.login}</Link>
              <Link
                href="/signup"
                className="font-semibold bg-emerald text-onnight px-4 py-2 rounded-full hover:bg-night transition"
              >
                {t.nav.signup}
              </Link>
            </>
          )}
        </div>
        <HeaderActions />
        {/* Mobile menu */}
        <MobileMenu userEmail={user?.email || ""} isAdmin={!!admin} />
        </div>
      </div>
    </header>
  );
}
