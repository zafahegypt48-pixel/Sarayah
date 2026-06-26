import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-ink text-ivory/70 mt-24">
      <div className="max-w-6xl mx-auto px-5 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
        <div className="col-span-2 sm:col-span-1">
          <div className="font-display text-2xl text-ivory mb-2">
            Zafah<span className="text-brass">.</span>{" "}
            <span className="text-ivory/50 text-lg" dir="rtl">الزفة</span>
          </div>
          <p className="text-sm leading-relaxed">
            Egypt&apos;s directory for wedding and event venues — hotels, gardens, villas, and rooftops in one place.
          </p>
        </div>
        <div>
          <div className="text-ivory font-semibold mb-3 text-sm">Explore</div>
          <ul className="space-y-2 text-sm">
            <li><Link href="/venues" className="hover:text-ivory transition">Browse venues</Link></li>
            <li><Link href="/search" className="hover:text-ivory transition">AI search assistant</Link></li>
            <li><Link href="/add-venue" className="hover:text-ivory transition">List your venue — free</Link></li>
            <li><Link href="/vip" className="hover:text-ivory transition">VIP listings (soon)</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-ivory font-semibold mb-3 text-sm">Company</div>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about" className="hover:text-ivory transition">About</Link></li>
            <li><Link href="/how-it-works" className="hover:text-ivory transition">How it works</Link></li>
            <li><Link href="/contact" className="hover:text-ivory transition">Contact</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-ivory font-semibold mb-3 text-sm">Legal</div>
          <ul className="space-y-2 text-sm">
            <li><Link href="/terms" className="hover:text-ivory transition">Terms of Use</Link></li>
            <li><Link href="/privacy" className="hover:text-ivory transition">Privacy Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ivory/10 py-4 text-center text-xs text-ivory/40">
        © {new Date().getFullYear()} Zafah — الزفة. Wedding &amp; event venues across Egypt.
      </div>
    </footer>
  );
}
