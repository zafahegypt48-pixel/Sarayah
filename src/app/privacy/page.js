export const metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Zafah (الزفة) — what data we collect, how we use it, and your choices.",
  alternates: { canonical: "/privacy" },
};

const COLLECT = [
  "Inquiry details you submit (event type, date, guests, budget, notes)",
  "Your name, email, and phone number",
  "Venue submission details and owner contact details",
  "Uploaded venue images",
  "Optional verification documents — only when our team requests them",
  "Report-listing messages and contact-form messages",
  "Technical logs and rate-limiting data (e.g. IP used to prevent spam)",
];

const USES = [
  "To manage and route inquiries to venues",
  "To review venue submissions before they go public",
  "To prevent scams, fake listings, and spam",
  "To improve the platform",
  "To contact users or venue owners when needed",
];

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      <p className="text-brass-deep text-sm font-semibold uppercase tracking-wide mb-2">Legal</p>
      <h1 className="font-display text-4xl text-ink mb-2">Privacy Policy</h1>
      <p className="text-ink/50 text-sm mb-8">Zafah — الزفة · informational draft</p>

      <div className="space-y-7">
        <section>
          <h2 className="font-display text-xl text-ink mb-3">Data we may collect</h2>
          <ul className="space-y-2">
            {COLLECT.map((c) => (
              <li key={c} className="flex gap-2 text-sm text-ink/65"><span className="text-emerald">•</span>{c}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">How we use data</h2>
          <ul className="space-y-2">
            {USES.map((u) => (
              <li key={u} className="flex gap-2 text-sm text-ink/65"><span className="text-emerald">•</span>{u}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl text-ink mb-3">Your data &amp; your choices</h2>
          <p className="text-sm text-ink/65 leading-relaxed">
            We do <b>not</b> sell your data. Verification documents, if provided, are kept private and
            accessible to admins only — never shown publicly. You can request removal or correction of
            your data by contacting us through the platform.
          </p>
        </section>
      </div>

      <div className="mt-8 bg-ink/5 border border-line rounded-2xl p-5 text-sm text-ink/60">
        This is a draft Privacy Policy for the launch (MVP) stage. Please have it reviewed legally before
        full commercial launch.
        <p className="mt-2" dir="rtl">
          هذه سياسة خصوصية مبدئية لمرحلة الإطلاق. يُنصح بمراجعتها قانونيًا قبل الإطلاق التجاري الكامل.
        </p>
      </div>
    </div>
  );
}
