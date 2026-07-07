"use client";
import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";

const PLACEHOLDER = "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80";

function formatEGP(n) {
  return Number(n || 0).toLocaleString("en-US");
}

export default function VenueCard({ venue }) {
  const { t, tv } = useI18n();
  const [loaded, setLoaded] = useState(false);

  const href = `/venues/${venue.id}`;
  const cover = (Array.isArray(venue.images) && venue.images[0]) || PLACEHOLDER;
  const location = [venue.area, venue.city].filter(Boolean).join(", ");

  const priceMin = venue.price_min ?? venue.startingPrice ?? 0;
  const priceMax = venue.price_max ?? 0;
  const priceLabel = priceMax && priceMax > priceMin
    ? `${formatEGP(priceMin)}–${formatEGP(priceMax)} ${t.concierge.currency}`
    : `${t.card.from} ${formatEGP(priceMin)} ${t.concierge.currency}`;

  const capLabel = venue.capacityMin && venue.capacityMax
    ? `${venue.capacityMin}–${venue.capacityMax}`
    : venue.capacityMax
      ? `${t.card.upTo} ${venue.capacityMax}`
      : null;

  return (
    <article className="group relative flex flex-col h-full bg-surface rounded-2xl border border-hair overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/10 hover:border-emerald/30">
      <Link href={href} className="block relative h-52 shrink-0 overflow-hidden" aria-label={venue.name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt={venue.name}
          onLoad={() => setLoaded(true)}
          className={`w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-105 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
        {venue.type && (
          <span className="absolute top-3 start-3 bg-canvas/95 text-cream text-xs font-semibold px-3 py-1 rounded-full">
            {tv("type", venue.type)}
          </span>
        )}
        {venue.indoorOutdoor && (
          <span className="absolute top-3 end-3 bg-emerald text-onnight text-xs font-semibold px-3 py-1 rounded-full">
            {tv("setting", venue.indoorOutdoor)}
          </span>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link href={href} className="min-w-0">
            <h3 className="font-display text-lg leading-tight text-cream group-hover:text-emerald transition-colors line-clamp-2 break-words">
              {venue.name}
              {venue.verification_status === "verified" && (
                <span className="ms-1.5 align-middle text-xs font-semibold text-blue-700" title={t.card.verifiedTitle}>✓</span>
              )}
            </h3>
          </Link>
          {venue.rating > 0 && (
            <div className="flex items-center gap-1 text-brass-deep text-sm shrink-0 pt-1">
              ★ <span className="text-cream/70">{venue.rating}</span>
              {venue.reviews > 0 && <span className="text-cream/40 text-xs">({venue.reviews})</span>}
            </div>
          )}
        </div>

        {location && <p className="text-sm text-cream/60 mt-1 truncate">{location}</p>}

        {venue.description && (
          <p className="text-sm text-cream/55 mt-2 line-clamp-2 leading-relaxed">{venue.description}</p>
        )}

        {/* Facts: capacity + price — pinned to the bottom (mt-auto) so the divider,
            facts, and action buttons share the same baseline across every card. */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-4 border-t border-hair">
          {capLabel ? (
            <div className="text-sm text-cream/60 min-w-0 truncate">
              <span className="font-semibold text-cream">{capLabel}</span> {t.card.guests}
            </div>
          ) : <span />}
          <div className="text-sm font-semibold text-emerald whitespace-nowrap shrink-0">{priceLabel}</div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          <Link
            href={href}
            className="flex-1 text-center text-sm font-semibold border border-hair text-cream rounded-full py-2.5 hover:border-emerald/50 transition active:scale-[0.97]"
          >
            {t.marketplace.viewDetails}
          </Link>
          <Link
            href={`${href}#inquiry`}
            className="flex-1 text-center text-sm font-semibold bg-emerald text-onnight rounded-full py-2.5 hover:opacity-90 transition active:scale-[0.97]"
          >
            {t.marketplace.inquire}
          </Link>
        </div>
      </div>
    </article>
  );
}
