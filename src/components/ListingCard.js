"use client";
import Link from "next/link";
import FavoriteButton from "@/components/FavoriteButton";
import { useI18n } from "@/lib/i18n/client";

const PLACEHOLDER = "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80";

function formatEGP(n) {
  return Number(n || 0).toLocaleString("en-US");
}

// Generic marketplace card — works for any category (venue, photographer, …).
// Shows cover image, category, name, location, starting price, and rating.
export default function ListingCard({ listing, category }) {
  const { t, tv, locale } = useI18n();
  const slugOrId = listing.slug || listing.id;
  const cover = (Array.isArray(listing.images) && listing.images[0]) || PLACEHOLDER;
  const price = listing.price_min ?? listing.startingPrice ?? 0;
  const location = [listing.area, listing.city].filter(Boolean).join(", ");
  const catName = category ? (locale === "ar" ? category.name_ar : category.name_en) : tv("type", listing.type);

  return (
    <div className="relative">
      {/* Favorite heart sits OUTSIDE the link (valid HTML) and over the image. */}
      <div className="absolute top-3 end-3 z-10">
        <FavoriteButton listingId={listing.id} />
      </div>
      <Link
        href={`/listing/${slugOrId}`}
        className="group block bg-surface rounded-2xl border border-hair overflow-hidden hover:shadow-lg hover:shadow-ink/5 transition-shadow"
      >
        <div className="relative h-52 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt={listing.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
          {catName && (
            <span className="absolute top-3 start-3 bg-canvas/95 text-cream text-xs font-semibold px-3 py-1 rounded-full">{catName}</span>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg leading-tight text-cream">
              {listing.name}
              {listing.verification_status === "verified" && (
                <span className="ms-1.5 align-middle text-xs font-semibold text-blue-700" title={t.card.verifiedTitle}>✓</span>
              )}
            </h3>
            {listing.rating > 0 && (
              <div className="flex items-center gap-1 text-brass-deep text-sm shrink-0 pt-1">
                ★ <span className="text-cream/70">{listing.rating}</span>
              </div>
            )}
          </div>
          {location && <p className="text-sm text-cream/60 mt-1">{location}</p>}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-hair">
            {price > 0 ? (
              <div className="text-sm font-semibold text-emerald">{t.marketplace.from} {formatEGP(price)} {t.concierge.currency}</div>
            ) : <span />}
            {listing.reviews > 0 && (
              <div className="text-xs text-cream/50">{t.marketplace.reviews.replace("{n}", listing.reviews)}</div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
