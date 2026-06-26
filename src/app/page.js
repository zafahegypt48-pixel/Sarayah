import Link from "next/link";
import VenueCard from "@/components/VenueCard";
import { getVenues } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const all = await getVenues();
  const venues = all.slice(0, 3);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink text-ivory">
        <div className="absolute inset-0 opacity-25">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1800&q=80"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-6xl mx-auto px-5 py-28 md:py-36">
          <p className="text-brass font-semibold tracking-wide text-sm uppercase mb-4">Venues across Egypt</p>
          <h1 className="font-display text-4xl md:text-6xl leading-[1.05] max-w-2xl">
            Find the venue your celebration deserves.
          </h1>
          <p className="mt-5 text-ivory/70 max-w-lg text-lg">
            Compare hotels, gardens, villas, and rooftops by capacity, price, and amenities — then send one inquiry instead of a dozen phone calls.
          </p>

          <form action="/search" className="mt-10 max-w-xl">
            <div className="flex items-center gap-2 bg-ivory rounded-full p-2 pl-5 shadow-xl">
              <input
                type="text"
                name="q"
                placeholder='Try "outdoor wedding in New Cairo for 300 guests"'
                className="flex-1 bg-transparent text-ink placeholder:text-ink/40 text-sm focus:outline-none"
              />
              <button className="bg-emerald text-ivory text-sm font-semibold px-5 py-3 rounded-full hover:opacity-90 transition shrink-0">
                Ask AI
              </button>
            </div>
          </form>

          <div className="flex flex-wrap gap-3 mt-6 text-sm text-ivory/60">
            <span>Popular:</span>
            {["Gardens in 6th of October", "Hotel ballrooms in Zamalek", "Rooftops for engagements"].map((t) => (
              <Link key={t} href={`/search?q=${encodeURIComponent(t)}`} className="underline hover:text-ivory">
                {t}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust strip (user-facing) */}
      <section className="bg-emerald text-ivory">
        <div className="max-w-6xl mx-auto px-5 py-6 flex flex-wrap justify-center sm:justify-between gap-6 text-sm text-center">
          <div><span className="font-display text-xl text-brass mr-2">Across Egypt</span>wedding &amp; event venues</div>
          <div><span className="font-display text-xl text-brass mr-2">Handpicked</span>&amp; reviewed before listing</div>
          <div><span className="font-display text-xl text-brass mr-2">One inquiry</span>instead of a dozen calls</div>
        </div>
      </section>

      {/* Featured venues */}
      <section className="max-w-6xl mx-auto px-5 py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-brass-deep text-sm font-semibold uppercase tracking-wide mb-2">Featured</p>
            <h2 className="font-display text-3xl text-ink">Venues worth a closer look</h2>
          </div>
          <Link href="/venues" className="text-sm font-semibold text-emerald hover:text-ink transition hidden sm:block">
            View all venues →
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map((v) => (
            <VenueCard key={v.id} venue={v} />
          ))}
        </div>
      </section>

      {/* CTA for venue owners */}
      <section className="max-w-6xl mx-auto px-5 pb-24">
        <div className="bg-white border border-line rounded-3xl p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h3 className="font-display text-2xl md:text-3xl text-ink mb-2">Own or manage a venue?</h3>
            <p className="text-ink/60 max-w-md">
              List your hotel, hall, garden, or villa for free while we&apos;re building up the platform. Send us your pricing in any format — we&apos;ll handle the rest.
            </p>
          </div>
          <Link
            href="/add-venue"
            className="bg-ink text-ivory font-semibold px-7 py-3.5 rounded-full hover:bg-emerald transition shrink-0"
          >
            List your venue — free
          </Link>
        </div>
      </section>
    </div>
  );
}
