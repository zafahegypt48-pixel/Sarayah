"use client";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";

const PLACEHOLDER = "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80";

function formatEGP(n) {
  return Number(n || 0).toLocaleString("en-US") + " EGP";
}

export default function VenueCard({ venue }) {
  const { t, tv } = useI18n();
  return (
    <Link
      href={`/venues/${venue.id}`}
      className="group block bg-surface rounded-2xl border border-hair overflow-hidden hover:shadow-lg hover:shadow-ink/5 transition-shadow"
    >
      <div className="relative h-52 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={(Array.isArray(venue.images) && venue.images[0]) || PLACEHOLDER}
          alt={venue.name}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
        />
        <span className="absolute top-3 start-3 bg-canvas/95 text-cream text-xs font-semibold px-3 py-1 rounded-full">
          {tv("type", venue.type)}
        </span>
        <span className="absolute top-3 end-3 bg-emerald text-onnight text-xs font-semibold px-3 py-1 rounded-full">
          {tv("setting", venue.indoorOutdoor)}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg leading-tight text-cream">
            {venue.name}
            {venue.verification_status === "verified" && (
              <span className="ms-1.5 align-middle text-xs font-semibold text-blue-700" title={t.card.verifiedTitle}>✓</span>
            )}
          </h3>
          {venue.rating > 0 && (
            <div className="flex items-center gap-1 text-brass-deep text-sm shrink-0 pt-1">
              ★ <span className="text-cream/70">{venue.rating}</span>
            </div>
          )}
        </div>
        <p className="text-sm text-cream/60 mt-1">{venue.area}, {venue.city}</p>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-hair">
          <div className="text-sm text-cream/60">
            {t.card.upTo} <span className="font-semibold text-cream">{venue.capacityMax}</span> {t.card.guests}
          </div>
          <div className="text-sm font-semibold text-emerald">
            {t.card.from} {formatEGP(venue.startingPrice)}
          </div>
        </div>
      </div>
    </Link>
  );
}
