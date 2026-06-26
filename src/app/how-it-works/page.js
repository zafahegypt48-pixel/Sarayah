import Link from "next/link";

export const metadata = {
  title: "How Zafah Works",
  description:
    "How Zafah (الزفة) works for couples and event planners, and for venue owners. Browse, compare, and send an inquiry — venues are reviewed before going public.",
  alternates: { canonical: "/how-it-works" },
};

const USER_STEPS = [
  "Browse venues across Egypt.",
  "Compare details — capacity, location, type, and price range.",
  "Submit an inquiry to the venues you like.",
  "The venue or the Zafah team follows up with you.",
  "Confirm prices, availability, contract, and payment directly with the venue.",
];

const OWNER_STEPS = [
  "Submit your venue through the “List your venue” form.",
  "Zafah reviews the listing for quality and accuracy.",
  "Approved listings appear publicly on Zafah.",
  "Verified venues may receive a trust badge after extra review.",
  "During launch, listing is completely free.",
];

function Steps({ steps }) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <span className="shrink-0 w-7 h-7 rounded-full bg-emerald text-ivory text-sm font-semibold flex items-center justify-center">{i + 1}</span>
          <span className="text-ink/70 leading-relaxed pt-0.5">{s}</span>
        </li>
      ))}
    </ol>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      <p className="text-brass-deep text-sm font-semibold uppercase tracking-wide mb-2">How it works</p>
      <h1 className="font-display text-4xl text-ink mb-8">
        How Zafah <span className="text-ink/40 text-2xl" dir="rtl">الزفة</span> works
      </h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-line rounded-2xl p-6">
          <h2 className="font-display text-2xl text-ink mb-4">For couples &amp; planners</h2>
          <Steps steps={USER_STEPS} />
        </div>
        <div className="bg-white border border-line rounded-2xl p-6">
          <h2 className="font-display text-2xl text-ink mb-4">For venue owners</h2>
          <Steps steps={OWNER_STEPS} />
          <Link href="/add-venue" className="inline-block mt-5 text-sm font-semibold text-emerald hover:text-ink transition">List your venue — free →</Link>
        </div>
      </div>

      <div className="mt-8 bg-ink/5 border border-line rounded-2xl p-6">
        <p className="text-sm text-ink/70 leading-relaxed">
          Zafah helps users discover and contact venues. We do not guarantee availability, prices,
          contracts, or payments. Always confirm directly with the venue before paying any money.
        </p>
        <p className="text-sm text-ink/70 leading-relaxed mt-3" dir="rtl">
          Zafah — الزفة تساعد المستخدمين على اكتشاف أماكن المناسبات والتواصل معها. لا نضمن التوافر أو
          الأسعار أو العقود أو المدفوعات. يجب التأكد مباشرة مع المكان قبل دفع أي مبالغ.
        </p>
      </div>
    </div>
  );
}
