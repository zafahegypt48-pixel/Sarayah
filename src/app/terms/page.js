import { getI18n } from "@/lib/i18n/server";

export const metadata = {
  title: "Terms of Use",
  description: "Terms of Use for Sarayah (سرايا) — a discovery and contact platform for wedding and event venues in Egypt.",
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  const { t } = await getI18n();
  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      <p className="text-brass-deep text-sm font-semibold uppercase tracking-wide mb-2">{t.terms.eyebrow}</p>
      <h1 className="font-display text-4xl text-cream mb-2">{t.terms.title}</h1>
      <p className="text-cream/50 text-sm mb-8">{t.terms.draftTag}</p>

      <div className="space-y-5">
        {t.terms.sections.map(([title, body], i) => (
          <div key={title}>
            <h2 className="font-semibold text-cream mb-1">{i + 1}. {title}</h2>
            <p className="text-sm text-cream/65 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-night/5 border border-hair rounded-2xl p-5 text-sm text-cream/60">
        {t.terms.note}
      </div>
    </div>
  );
}
