import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";

export const metadata = {
  title: "How Sarayah Works",
  description:
    "How Sarayah (سرايا) works for couples and event planners, and for venue owners. Browse, compare, and send an inquiry — venues are reviewed before going public.",
  alternates: { canonical: "/how-it-works" },
};

function Steps({ steps }) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <span className="shrink-0 w-7 h-7 rounded-full bg-emerald text-onnight text-sm font-semibold flex items-center justify-center">{i + 1}</span>
          <span className="text-cream/70 leading-relaxed pt-0.5">{s}</span>
        </li>
      ))}
    </ol>
  );
}

export default async function HowItWorksPage() {
  const { t } = await getI18n();
  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      <p className="text-brass-deep text-sm font-semibold uppercase tracking-wide mb-2">{t.howItWorks.eyebrow}</p>
      <h1 className="font-display text-4xl text-cream mb-8">
        {t.howItWorks.title}
      </h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-surface border border-hair rounded-2xl p-6">
          <h2 className="font-display text-2xl text-cream mb-4">{t.howItWorks.forCouples}</h2>
          <Steps steps={t.howItWorks.userSteps} />
        </div>
        <div className="bg-surface border border-hair rounded-2xl p-6">
          <h2 className="font-display text-2xl text-cream mb-4">{t.howItWorks.forOwners}</h2>
          <Steps steps={t.howItWorks.ownerSteps} />
          <Link href="/add-venue" className="inline-block mt-5 text-sm font-semibold text-emerald hover:text-cream transition">{t.howItWorks.listFree}</Link>
        </div>
      </div>

      <div className="mt-8 bg-night/5 border border-hair rounded-2xl p-6">
        <p className="text-sm text-cream/70 leading-relaxed">
          {t.howItWorks.disclaimer}
        </p>
      </div>
    </div>
  );
}
