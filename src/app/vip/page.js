import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";

export const metadata = {
  title: "VIP venue listings — coming soon",
  description:
    "Premium placement and featured listings for venues on Sarayah are coming soon. Join the waitlist to be first.",
};

export default async function VipPage() {
  const { t } = await getI18n();
  return (
    <div className="max-w-4xl mx-auto px-5 py-20">
      <p className="text-brass-deep text-sm font-semibold uppercase tracking-wide mb-2 text-center">
        {t.vip.eyebrow}
      </p>
      <h1 className="font-display text-4xl md:text-5xl text-cream text-center">
        {t.vip.titlePre}<span className="text-emerald">{t.vip.titleHighlight}</span>
      </h1>
      <p className="text-cream/60 text-center mt-4 max-w-xl mx-auto">
        {t.vip.intro}
      </p>

      <div className="grid sm:grid-cols-2 gap-5 mt-12">
        {t.vip.perks.map(([title, desc]) => (
          <div key={title} className="bg-surface border border-hair rounded-2xl p-6">
            <h3 className="font-semibold text-cream mb-1">{title}</h3>
            <p className="text-sm text-cream/60">{desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-night text-onnight rounded-3xl p-10 mt-12 text-center">
        <h2 className="font-display text-2xl mb-2">{t.vip.ctaTitle}</h2>
        <p className="text-cream/70 mb-6 max-w-md mx-auto">
          {t.vip.ctaBody}
        </p>
        <Link
          href="/add-venue"
          className="inline-block bg-emerald text-onnight font-semibold px-7 py-3.5 rounded-full hover:opacity-90 transition"
        >
          {t.vip.ctaButton}
        </Link>
      </div>

      {/*
        TODO (monetization): wire a real payment/subscription provider here when
        ready (e.g. Paymob or Fawry for the Egyptian market, or Stripe).
        Steps when implementing:
          1. Add provider keys to env (server-only).
          2. Add a `tier`/`vip_until` column to the venues table.
          3. Create a checkout API route + webhook to set the tier on payment.
          4. Sort/badge VIP venues in listings and search.
        Do NOT add fake checkout buttons before the provider is configured.
      */}
    </div>
  );
}
