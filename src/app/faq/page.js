import { getI18n } from "@/lib/i18n/server";

export const metadata = {
  title: "FAQ — Frequently Asked Questions",
  description: "Answers to common questions about Sarayah — how inquiries work, listing your business, reviews, and verification.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const { t } = await getI18n();
  // FAQPage structured data (rich results in search).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: t.faq.items.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <p className="text-brass-deep text-sm font-semibold uppercase tracking-wide mb-2">{t.faq.eyebrow}</p>
      <h1 className="font-display text-4xl text-cream mb-8">{t.faq.title}</h1>
      <div className="space-y-4">
        {t.faq.items.map(([q, a], i) => (
          <details key={i} className="bg-surface border border-hair rounded-2xl p-5 group">
            <summary className="font-semibold text-cream cursor-pointer list-none flex items-center justify-between">
              {q}
              <span className="text-cream/40 group-open:rotate-45 transition">＋</span>
            </summary>
            <p className="text-sm text-cream/70 leading-relaxed mt-3">{a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
