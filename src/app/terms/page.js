export const metadata = {
  title: "Terms of Use",
  description: "Terms of Use for Zafah (الزفة) — a discovery and contact platform for wedding and event venues in Egypt.",
  alternates: { canonical: "/terms" },
};

const SECTIONS = [
  ["What Zafah is", "Zafah (الزفة) is a discovery and contact platform for wedding and event venues in Egypt. It helps users find venues and send inquiries."],
  ["Venue information may change", "Listings may include prices, capacity, images, amenities, and availability. This information can change at any time and may not always be current."],
  ["Confirm before booking or paying", "You must confirm all information — availability, prices, contracts, and payment terms — directly with the venue before booking or paying any money."],
  ["No payments or bookings in-app", "Zafah does not currently process payments, deposits, contracts, or bookings. Any agreement is made directly between you and the venue."],
  ["Private agreements", "Zafah is not responsible for private agreements, payments, or arrangements made outside the platform."],
  ["Venue obligations", "Venues must submit accurate information and must not impersonate other venues or businesses. Fake or impersonated listings are removed."],
  ["Moderation rights", "Zafah may approve, reject, suspend, or remove any listing at its discretion to keep the platform safe and accurate."],
  ["“Verified by Zafah”", "A “Verified by Zafah” badge means we reviewed extra proof for that venue. It is a trust signal, not a guarantee — always confirm final details with the venue."],
  ["Reporting", "You can report suspicious or inaccurate listings using the “Report this listing” option on any venue page."],
];

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      <p className="text-brass-deep text-sm font-semibold uppercase tracking-wide mb-2">Legal</p>
      <h1 className="font-display text-4xl text-ink mb-2">Terms of Use</h1>
      <p className="text-ink/50 text-sm mb-8">Zafah — الزفة · informational draft</p>

      <div className="space-y-5">
        {SECTIONS.map(([title, body], i) => (
          <div key={title}>
            <h2 className="font-semibold text-ink mb-1">{i + 1}. {title}</h2>
            <p className="text-sm text-ink/65 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-ink/5 border border-line rounded-2xl p-5 text-sm text-ink/60">
        This is a draft, informational Terms of Use for the launch (MVP) stage and is not formal legal
        advice. Please have it reviewed by a lawyer before full commercial launch.
        <p className="mt-2" dir="rtl">
          هذه نسخة مبدئية للتعريف فقط في مرحلة الإطلاق وليست استشارة قانونية. يُنصح بمراجعتها قانونيًا قبل الإطلاق التجاري الكامل.
        </p>
      </div>
    </div>
  );
}
