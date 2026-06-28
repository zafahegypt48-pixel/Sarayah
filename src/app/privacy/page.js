import { getI18n } from "@/lib/i18n/server";

export const metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Sarayah (سرايا) — what data we collect, how we use it, and your choices.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const { t } = await getI18n();
  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      <p className="text-brass-deep text-sm font-semibold uppercase tracking-wide mb-2">{t.privacy.eyebrow}</p>
      <h1 className="font-display text-4xl text-cream mb-2">{t.privacy.title}</h1>
      <p className="text-cream/50 text-sm mb-8">{t.privacy.draftTag}</p>

      <div className="space-y-7">
        <section>
          <h2 className="font-display text-xl text-cream mb-3">{t.privacy.collectTitle}</h2>
          <ul className="space-y-2">
            {t.privacy.collect.map((c) => (
              <li key={c} className="flex gap-2 text-sm text-cream/65"><span className="text-emerald">•</span>{c}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl text-cream mb-3">{t.privacy.usesTitle}</h2>
          <ul className="space-y-2">
            {t.privacy.uses.map((u) => (
              <li key={u} className="flex gap-2 text-sm text-cream/65"><span className="text-emerald">•</span>{u}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl text-cream mb-3">{t.privacy.choicesTitle}</h2>
          <p className="text-sm text-cream/65 leading-relaxed">
            {t.privacy.choicesBody}
          </p>
        </section>
      </div>

      <div className="mt-8 bg-night/5 border border-hair rounded-2xl p-5 text-sm text-cream/60">
        {t.privacy.note}
      </div>
    </div>
  );
}
