// Venue location: a "View on Google Maps" button + an embedded mini-map.
//
// Uses Google Maps' KEYLESS embed (`?q=...&output=embed`) so there is NO API key,
// NO billing account, and NO new database column required — it's built from the
// venue's name + area + city. If the owner pasted an exact Google Maps link, the
// button uses that for precision; the embed always uses the address query.
export default function VenueMap({ name, area, city, link, title, viewLabel, approxNote }) {
  const parts = [name, area, city, "Egypt"].filter(Boolean);
  // Nothing to locate → render nothing.
  if (parts.length <= 1) return null;

  const query = encodeURIComponent(parts.join(", "));
  const embedSrc = `https://www.google.com/maps?q=${query}&output=embed`;
  const viewHref = link && /^https?:\/\//i.test(link)
    ? link
    : `https://www.google.com/maps/search/?api=1&query=${query}`;

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-display text-xl text-cream">{title}</h2>
        <a
          href={viewHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald hover:text-cream transition shrink-0"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {viewLabel}
        </a>
      </div>
      <div className="rounded-2xl overflow-hidden border border-hair h-64 sm:h-80 bg-surface">
        <iframe
          title={title}
          src={embedSrc}
          className="w-full h-full"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
      {approxNote && <p className="text-xs text-cream/45 mt-2">{approxNote}</p>}
    </div>
  );
}
