import Link from "next/link";

const PLACEHOLDER = "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80";

function formatEGP(n) {
  return Number(n || 0).toLocaleString("en-US") + " EGP";
}

export default function VenueCard({ venue }) {
  return (
    <Link
      href={`/venues/${venue.id}`}
      className="group block bg-white rounded-2xl border border-line overflow-hidden hover:shadow-lg hover:shadow-ink/5 transition-shadow"
    >
      <div className="relative h-52 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={(Array.isArray(venue.images) && venue.images[0]) || PLACEHOLDER}
          alt={venue.name}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
        />
        <span className="absolute top-3 left-3 bg-ivory/95 text-ink text-xs font-semibold px-3 py-1 rounded-full">
          {venue.type}
        </span>
        <span className="absolute top-3 right-3 bg-emerald text-ivory text-xs font-semibold px-3 py-1 rounded-full">
          {venue.indoorOutdoor}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg leading-tight text-ink">
            {venue.name}
            {venue.verification_status === "verified" && (
              <span className="ml-1.5 align-middle text-xs font-semibold text-blue-700" title="Verified by Zafah">✓</span>
            )}
          </h3>
          {venue.rating > 0 && (
            <div className="flex items-center gap-1 text-brass-deep text-sm shrink-0 pt-1">
              ★ <span className="text-ink/70">{venue.rating}</span>
            </div>
          )}
        </div>
        <p className="text-sm text-ink/60 mt-1">{venue.area}, {venue.city}</p>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-line">
          <div className="text-sm text-ink/60">
            Up to <span className="font-semibold text-ink">{venue.capacityMax}</span> guests
          </div>
          <div className="text-sm font-semibold text-emerald">
            From {formatEGP(venue.startingPrice)}
          </div>
        </div>
      </div>
    </Link>
  );
}
