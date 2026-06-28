import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";

export const metadata = {
  title: "About Sarayah — About سرايا",
  description:
    "Sarayah (سرايا) helps couples and event planners discover wedding and event venues across Egypt — search by city, capacity, type, budget, and amenities.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const { t } = await getI18n();
  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      <p className="text-brass-deep text-sm font-semibold uppercase tracking-wide mb-2">{t.about.eyebrow}</p>
      <h1 className="font-display text-4xl text-cream mb-4">
        {t.about.title}
      </h1>
      <p className="text-cream/70 leading-relaxed">
        {t.about.intro}
      </p>

      <div className="grid sm:grid-cols-2 gap-5 mt-10">
        {t.about.cards.map(([title, body]) => (
          <div key={title} className="bg-surface border border-hair rounded-2xl p-6">
            <h2 className="font-semibold text-cream mb-1.5">{title}</h2>
            <p className="text-sm text-cream/60 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/venues" className="bg-emerald text-onnight font-semibold px-6 py-3 rounded-full hover:opacity-90 transition">{t.about.browse}</Link>
        <Link href="/how-it-works" className="bg-surface border border-hair text-cream font-semibold px-6 py-3 rounded-full hover:border-emerald/40 transition">{t.about.howItWorks}</Link>
      </div>
    </div>
  );
}
