import Link from "next/link";

export const metadata = {
  title: "VIP venue listings — coming soon",
  description:
    "Premium placement and featured listings for venues on Zafah are coming soon. Join the waitlist to be first.",
};

const PERKS = [
  ["Featured placement", "Appear at the top of search and listings for your city."],
  ["Verified badge", "A trust badge that tells couples your venue is verified by Zafah."],
  ["Priority leads", "Get booking inquiries delivered first, with richer details."],
  ["Photo galleries", "Showcase more photos and highlight your best spaces."],
];

export default function VipPage() {
  return (
    <div className="max-w-4xl mx-auto px-5 py-20">
      <p className="text-brass-deep text-sm font-semibold uppercase tracking-wide mb-2 text-center">
        For venue owners
      </p>
      <h1 className="font-display text-4xl md:text-5xl text-ink text-center">
        VIP listings — <span className="text-emerald">coming soon</span>
      </h1>
      <p className="text-ink/60 text-center mt-4 max-w-xl mx-auto">
        Listing on Zafah is free during launch. Soon, venues will be able to upgrade
        to VIP for premium placement and more booking inquiries. No payment is
        required today — we&apos;ll let you know the moment it&apos;s ready.
      </p>

      <div className="grid sm:grid-cols-2 gap-5 mt-12">
        {PERKS.map(([title, desc]) => (
          <div key={title} className="bg-white border border-line rounded-2xl p-6">
            <h3 className="font-semibold text-ink mb-1">{title}</h3>
            <p className="text-sm text-ink/60">{desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-ink text-ivory rounded-3xl p-10 mt-12 text-center">
        <h2 className="font-display text-2xl mb-2">Want VIP when it launches?</h2>
        <p className="text-ivory/70 mb-6 max-w-md mx-auto">
          List your venue for free now — every free listing is first in line for the VIP early-access offer.
        </p>
        <Link
          href="/add-venue"
          className="inline-block bg-emerald text-ivory font-semibold px-7 py-3.5 rounded-full hover:opacity-90 transition"
        >
          List your venue — free
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
