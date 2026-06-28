import Link from "next/link";
import VenueCard from "@/components/VenueCard";
import CategoryGrid from "@/components/CategoryGrid";
import Reveal from "@/components/Reveal";
import { searchVenues, getCategories, getGovernorates, isCategoryActive } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Only fetch the 3 featured venues from the DB (don't load the whole table).
  const { venues } = await searchVenues({ page: 1, pageSize: 3 });
  const [categories, governorates, { t, locale }] = await Promise.all([
    getCategories(),
    getGovernorates(),
    getI18n(),
  ]);

  // Dynamic "popular" chips — built from live categories × top governorates, so
  // they reflect real, browsable destinations instead of hardcoded strings.
  const activeCats = categories.filter((c) => isCategoryActive(c.id));
  const cityPool = governorates.slice(0, 3);
  const popularChips = Array.from({ length: Math.min(4, activeCats.length * Math.max(1, cityPool.length)) }, (_, i) => {
    const c = activeCats[i % activeCats.length];
    const g = cityPool.length ? cityPool[i % cityPool.length] : null;
    if (!c) return null;
    const cName = locale === "ar" ? c.name_ar : c.name_en;
    const gName = g ? (locale === "ar" ? g.name_ar : g.name_en) : null;
    return { label: gName ? `${cName} — ${gName}` : cName, href: `/c/${c.id}${g ? `?gov=${g.id}` : ""}` };
  }).filter(Boolean);

  return (
    <div>
      {/* Hero (always dark, with always-light text) */}
      <section className="relative overflow-hidden bg-night text-onnight">
        <div className="absolute inset-0 opacity-25">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1800&q=80"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-6xl mx-auto px-5 py-28 md:py-36">
          <p className="text-brass font-semibold tracking-wide text-sm uppercase mb-4 animate-fade-up" style={{ animationDelay: "60ms" }}>{t.home.eyebrow}</p>
          <h1 className="font-display text-4xl md:text-6xl leading-[1.05] max-w-2xl animate-fade-up" style={{ animationDelay: "140ms" }}>
            {t.home.title}
          </h1>
          <p className="mt-5 text-onnight/70 max-w-lg text-lg animate-fade-up" style={{ animationDelay: "240ms" }}>
            {t.home.subtitle}
          </p>

          <form action="/search" className="mt-10 max-w-xl animate-fade-up" style={{ animationDelay: "340ms" }}>
            <div className="flex items-center gap-2 bg-surface rounded-full p-2 ps-5 shadow-xl">
              <input
                type="text"
                name="q"
                placeholder={t.home.searchPlaceholder}
                className="flex-1 bg-transparent text-cream placeholder:text-cream/40 text-sm focus:outline-none"
              />
              <button className="bg-emerald text-onnight text-sm font-semibold px-5 py-3 rounded-full hover:opacity-90 transition shrink-0">
                {t.home.searchButton}
              </button>
            </div>
          </form>

          {popularChips.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6 text-sm text-onnight/70 items-center animate-fade-up" style={{ animationDelay: "440ms" }}>
              <span>{t.home.popular}</span>
              {popularChips.map((chip, i) => (
                <Link key={i} href={chip.href} className="bg-surface text-cream border border-hair rounded-full px-3 py-1 hover:border-emerald/50 hover:-translate-y-0.5 transition">
                  {chip.label}
                </Link>
              ))}
            </div>
          )}

          <Link href="/concierge" className="inline-flex items-center gap-2 mt-7 text-sm font-semibold text-night bg-brass hover:bg-brass-deep hover:-translate-y-0.5 active:scale-95 transition px-5 py-2.5 rounded-full animate-fade-up" style={{ animationDelay: "540ms" }}>
            ✦ {t.concierge.eyebrow}
          </Link>
        </div>
      </section>

      {/* Trust strip (user-facing) */}
      <section className="bg-emerald text-onnight">
        <div className="max-w-6xl mx-auto px-5 py-6 flex flex-wrap justify-center sm:justify-between gap-6 text-sm text-center">
          {t.home.trust.map((item, i) => (
            <div key={i}><span className="font-display text-xl text-brass me-2">{item.strong}</span>{item.rest}</div>
          ))}
        </div>
      </section>

      {/* Browse by category */}
      <Reveal as="section" className="max-w-6xl mx-auto px-5 pt-20 pb-4">
        <div className="mb-8">
          <p className="text-brass-deep text-sm font-semibold uppercase tracking-wide mb-2">{t.marketplace.categoriesEyebrow}</p>
          <h2 className="font-display text-3xl text-cream">{t.marketplace.categoriesTitle}</h2>
        </div>
        <CategoryGrid categories={categories} />
      </Reveal>

      {/* Featured venues */}
      <Reveal as="section" className="max-w-6xl mx-auto px-5 py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-brass-deep text-sm font-semibold uppercase tracking-wide mb-2">{t.home.featuredEyebrow}</p>
            <h2 className="font-display text-3xl text-cream">{t.home.featuredTitle}</h2>
          </div>
          <Link href="/venues" className="text-sm font-semibold text-emerald hover:text-cream transition hidden sm:block">
            {t.home.viewAll}
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map((v) => (
            <VenueCard key={v.id} venue={v} />
          ))}
        </div>
      </Reveal>

      {/* CTA for venue owners */}
      <Reveal as="section" className="max-w-6xl mx-auto px-5 pb-24">
        <div className="bg-surface border border-hair rounded-3xl p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h3 className="font-display text-2xl md:text-3xl text-cream mb-2">{t.home.ownerTitle}</h3>
            <p className="text-cream/60 max-w-md">
              {t.home.ownerText}
            </p>
          </div>
          <Link
            href="/add-venue"
            className="bg-brass text-night font-semibold px-7 py-3.5 rounded-full hover:bg-brass-deep transition shrink-0"
          >
            {t.home.ownerButton}
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
