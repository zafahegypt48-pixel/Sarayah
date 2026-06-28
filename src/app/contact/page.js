import ContactForm from "@/components/ContactForm";
import { getI18n } from "@/lib/i18n/server";

export const metadata = {
  title: "Contact Sarayah",
  description: "Contact Sarayah (سرايا) — for users, venue owners, partnerships, or to report an issue.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const { t } = await getI18n();
  return (
    <div className="max-w-2xl mx-auto px-5 py-16">
      <p className="text-brass-deep text-sm font-semibold uppercase tracking-wide mb-2">{t.contact.eyebrow}</p>
      <h1 className="font-display text-4xl text-cream mb-3">
        {t.contact.title}
      </h1>
      <p className="text-cream/60 mb-8">
        {t.contact.intro}
      </p>

      <ContactForm />

      <p className="text-xs text-cream/40 text-center mt-4">
        {t.contact.footnote}
      </p>
    </div>
  );
}
