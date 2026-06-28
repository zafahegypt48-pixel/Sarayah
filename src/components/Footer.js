import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import { getI18n } from "@/lib/i18n/server";

export default async function Footer() {
  const { t } = await getI18n();
  return (
    <footer className="bg-night text-onnight/70 mt-24">
      <div className="max-w-6xl mx-auto px-5 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
        <div className="col-span-2 sm:col-span-1">
          <div className="mb-3">
            <Wordmark className="text-2xl text-onnight" />
          </div>
          <p className="text-sm leading-relaxed">
            {t.footer.tagline}
          </p>
        </div>
        <div>
          <div className="text-onnight font-semibold mb-3 text-sm">{t.footer.explore}</div>
          <ul className="space-y-2 text-sm">
            <li><Link href="/venues" className="hover:text-onnight transition">{t.footer.browseVenues}</Link></li>
            <li><Link href="/search" className="hover:text-onnight transition">{t.footer.aiSearchAssistant}</Link></li>
            <li><Link href="/add-venue" className="hover:text-onnight transition">{t.footer.listFree}</Link></li>
            <li><Link href="/vip" className="hover:text-onnight transition">{t.footer.vipSoon}</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-onnight font-semibold mb-3 text-sm">{t.footer.company}</div>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about" className="hover:text-onnight transition">{t.footer.about}</Link></li>
            <li><Link href="/how-it-works" className="hover:text-onnight transition">{t.footer.howItWorks}</Link></li>
            <li><Link href="/faq" className="hover:text-onnight transition">{t.footer.faq}</Link></li>
            <li><Link href="/contact" className="hover:text-onnight transition">{t.footer.contact}</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-onnight font-semibold mb-3 text-sm">{t.footer.legal}</div>
          <ul className="space-y-2 text-sm">
            <li><Link href="/terms" className="hover:text-onnight transition">{t.footer.terms}</Link></li>
            <li><Link href="/privacy" className="hover:text-onnight transition">{t.footer.privacy}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-hair/10 py-4 text-center text-xs text-onnight/40">
        © {new Date().getFullYear()} {t.brand}. {t.footer.rights}
      </div>
    </footer>
  );
}
