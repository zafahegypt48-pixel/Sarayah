import Link from "next/link";
import { notFound } from "next/navigation";
import LeadForm from "@/components/LeadForm";
import ReportVenue from "@/components/ReportVenue";
import Reviews from "@/components/Reviews";
import FavoriteButton from "@/components/FavoriteButton";
import { getListingBySlug, getVenueById, getCategory, getApprovedReviews, getPackages } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";

const AMENITY_KEYS = ["catering", "parking", "bridalRoom", "dj", "decoration", "kidsArea", "ac", "valet"];

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const listing = (await getListingBySlug(slug)) || (await getVenueById(slug));
  if (!listing) return { title: "Listing" };
  return {
    title: listing.name,
    description: (listing.description || `${listing.name} on Sarayah`).slice(0, 160),
    alternates: { canonical: `/listing/${listing.slug || listing.id}` },
  };
}

export default async function ListingDetailPage({ params }) {
  const { slug } = await params;
  // Accept either a slug or a raw id (cards link by slug||id).
  const listing = (await getListingBySlug(slug)) || (await getVenueById(slug));
  if (!listing) return notFound();

  const { t, tv, locale } = await getI18n();
  const [category, reviews, packages] = await Promise.all([
    listing.category_id ? getCategory(listing.category_id) : null,
    getApprovedReviews(listing.id),
    getPackages(listing.id),
  ]);
  const catName = category ? (locale === "ar" ? category.name_ar : category.name_en) : tv("type", listing.type);
  const isVenue = (listing.category_id || "venues") === "venues";
  const activeAmenities = AMENITY_KEYS.filter((k) => listing[k]);

  const imgs = Array.isArray(listing.images) && listing.images.length > 0
    ? listing.images
    : ["https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80"];

  const priceMin = listing.price_min ?? listing.startingPrice ?? 0;
  const priceMax = listing.price_max ?? 0;
  const priceLabel = priceMax && priceMax > priceMin
    ? `${Number(priceMin).toLocaleString()}–${Number(priceMax).toLocaleString()} ${t.concierge.currency}`
    : `${Number(priceMin).toLocaleString()} ${t.concierge.currency}`;

  // LocalBusiness structured data (rich results: name, rating, price).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: listing.name,
    image: imgs,
    address: { "@type": "PostalAddress", addressLocality: listing.city || undefined, addressCountry: "EG" },
    priceRange: `${priceMin} EGP`,
    ...(listing.rating > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: listing.rating, reviewCount: listing.reviews || 0 } }
      : {}),
  };

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {/* Gallery */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 h-64 sm:h-[420px] rounded-2xl overflow-hidden mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgs[0]} alt={listing.name} className="sm:col-span-2 h-full w-full object-cover" />
        {imgs.length > 1 && (
          <div className="hidden sm:grid grid-rows-2 gap-3">
            {imgs.slice(1, 3).map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={img} alt="" className="h-full w-full object-cover" />
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          {category && (
            <Link href={`/c/${category.id}`} className="text-sm font-semibold text-emerald hover:text-cream transition">
              {t.marketplace.backToCategory.replace("{category}", catName)}
            </Link>
          )}
          <div className="flex items-start justify-between gap-4 mt-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold bg-emerald/10 text-emerald px-3 py-1 rounded-full">{catName}</span>
                {listing.verification_status === "verified" && (
                  <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{t.detail.verifiedBadge}</span>
                )}
              </div>
              <h1 className="font-display text-3xl md:text-4xl text-cream mt-3">{listing.name}</h1>
              <p className="text-cream/60 mt-1">{[listing.area, listing.city].filter(Boolean).join(", ")}</p>
            </div>
            {listing.rating > 0 && (
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 justify-end text-brass-deep font-semibold">★ {listing.rating}</div>
                {listing.reviews > 0 && <p className="text-xs text-cream/50">{t.marketplace.reviews.replace("{n}", listing.reviews)}</p>}
              </div>
            )}
          </div>

          {listing.description && <p className="text-cream/70 leading-relaxed mt-6">{listing.description}</p>}

          {/* Venue-only facts */}
          {isVenue && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
              <Fact label={t.detail.capacity} value={t.detail.capacityValue.replace("{min}", listing.capacityMin).replace("{max}", listing.capacityMax)} />
              <Fact label={t.detail.halls} value={listing.halls} />
              <Fact label={t.detail.venueSize} value={`${listing.venueSize} m²`} />
              <Fact label={t.detail.setting} value={tv("setting", listing.indoorOutdoor)} />
            </div>
          )}

          {activeAmenities.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display text-xl text-cream mb-4">{t.detail.amenitiesTitle}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {activeAmenities.map((k) => (
                  <div key={k} className="flex items-center gap-2 text-sm text-cream/70">
                    <span className="text-emerald">✓</span> {t.detail.amenityLabels[k]}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Packages */}
          {packages && packages.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display text-xl text-cream mb-4">{t.marketplace.packagesTitle}</h2>
              <div className="space-y-3">
                {packages.map((p) => (
                  <div key={p.id} className="bg-surface border border-hair rounded-2xl p-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-cream">{locale === "ar" ? (p.name_ar || p.name_en) : (p.name_en || p.name_ar)}</p>
                      {Array.isArray(p.includes) && p.includes.length > 0 && (
                        <p className="text-sm text-cream/60 mt-1">{t.marketplace.includes}: {p.includes.join(locale === "ar" ? "، " : ", ")}</p>
                      )}
                    </div>
                    {p.price > 0 && (
                      <p className="font-semibold text-emerald whitespace-nowrap">{Number(p.price).toLocaleString()} {p.currency || t.concierge.currency}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10 bg-surface border border-hair rounded-2xl p-5">
            <p className="text-sm text-cream/60 leading-relaxed">{t.detail.disclaimer}</p>
            <ReportVenue venueId={listing.id} />
          </div>

          {/* Reviews */}
          <Reviews listingId={listing.id} reviews={reviews} />
        </div>

        {/* Sticky inquiry */}
        <div>
          <div className="sticky top-24 bg-surface border border-hair rounded-2xl p-6">
            <div className="flex items-start justify-between gap-3 mb-1">
              <p className="text-sm text-cream/50">{t.marketplace.startingPrice}</p>
              <FavoriteButton listingId={listing.id} size="lg" />
            </div>
            <p className="font-display text-2xl text-emerald mb-5">{priceLabel}</p>
            <h3 className="font-semibold text-cream mb-4">{t.detail.sendInquiryTitle}</h3>
            <LeadForm venueId={listing.id} venueName={listing.name} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div className="bg-surface border border-hair rounded-xl p-4">
      <p className="text-xs text-cream/50 mb-1">{label}</p>
      <p className="font-semibold text-cream">{value}</p>
    </div>
  );
}
