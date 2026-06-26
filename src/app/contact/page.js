import ContactForm from "@/components/ContactForm";

export const metadata = {
  title: "Contact Zafah",
  description: "Contact Zafah (الزفة) — for users, venue owners, partnerships, or to report an issue.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-16">
      <p className="text-brass-deep text-sm font-semibold uppercase tracking-wide mb-2">Contact</p>
      <h1 className="font-display text-4xl text-ink mb-3">
        Contact Zafah <span className="text-ink/40 text-2xl" dir="rtl">الزفة</span>
      </h1>
      <p className="text-ink/60 mb-8">
        Whether you&apos;re planning an event, own a venue, want to partner, or need to report an issue —
        send us a message and we&apos;ll get back to you.
      </p>

      <ContactForm />

      <p className="text-xs text-ink/40 text-center mt-4">
        For urgent issues, please reach us through this form — we monitor messages during launch.
      </p>
    </div>
  );
}
