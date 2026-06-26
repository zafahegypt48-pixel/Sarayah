import Link from "next/link";

export const metadata = {
  title: "About Zafah — About الزفة",
  description:
    "Zafah (الزفة) helps couples and event planners discover wedding and event venues across Egypt — search by city, capacity, type, budget, and amenities.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      <p className="text-brass-deep text-sm font-semibold uppercase tracking-wide mb-2">About</p>
      <h1 className="font-display text-4xl text-ink mb-4">
        About Zafah <span className="text-ink/40 text-2xl" dir="rtl">الزفة</span>
      </h1>
      <p className="text-ink/70 leading-relaxed">
        Zafah (الزفة) helps couples and event planners discover wedding and event venues across Egypt —
        hotels, halls, gardens, villas, and rooftops — all in one place.
      </p>

      <div className="grid sm:grid-cols-2 gap-5 mt-10">
        {[
          ["Search that fits Egypt", "Find venues by city, capacity, type, budget, and amenities — then send one inquiry instead of a dozen phone calls."],
          ["Reviewed before they're public", "Every venue is reviewed by our team before it appears on the site. Pending and rejected listings are never shown publicly."],
          ["Verified by Zafah", "Some venues carry a “Verified by Zafah” badge, which means we reviewed extra proof of ownership. Always confirm final details with the venue directly."],
          ["Launch / MVP stage", "Zafah is currently in its launch (MVP) stage. We're growing the directory carefully and welcome your feedback."],
        ].map(([title, body]) => (
          <div key={title} className="bg-white border border-line rounded-2xl p-6">
            <h2 className="font-semibold text-ink mb-1.5">{title}</h2>
            <p className="text-sm text-ink/60 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/venues" className="bg-emerald text-ivory font-semibold px-6 py-3 rounded-full hover:opacity-90 transition">Browse venues</Link>
        <Link href="/how-it-works" className="bg-white border border-line text-ink font-semibold px-6 py-3 rounded-full hover:border-emerald/40 transition">How it works</Link>
      </div>
    </div>
  );
}
