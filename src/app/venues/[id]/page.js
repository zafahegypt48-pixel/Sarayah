import { getVenueById } from "@/lib/data";
import LeadForm from "@/components/LeadForm";
import ReportVenue from "@/components/ReportVenue";
import { notFound } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";

const AMENITY_KEYS = ["catering", "parking", "bridalRoom", "dj", "decoration", "kidsArea", "ac", "valet"];

export const dynamic = "force-dynamic";

export default async function VenueDetailsPage({ params }) {
  const { id } = await params;
  const venue = await getVenueById(id);
  if (!venue) return notFound();

  const { t, tv } = await getI18n();
  const amenityLabels = t.detail.amenityLabels;
  const activeAmenities = AMENITY_KEYS.filter((k) => venue[k]);

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      {/* Image gallery */}
      {(() => {
        const imgs = Array.isArray(venue.images) && venue.images.length > 0
          ? venue.images
          : ["https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80"];
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 h-64 sm:h-[420px] rounded-2xl overflow-hidden mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgs[0]} alt={venue.name} className="sm:col-span-2 h-full w-full object-cover" />
            {imgs.length > 1 && (
              <div className="hidden sm:grid grid-rows-2 gap-3">
                {imgs.slice(1, 3).map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={img} alt="" className="h-full w-full object-cover" />
                ))}
              </div>
            )}
          </div>
        );
      })()}

      <div className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold bg-emerald/10 text-emerald px-3 py-1 rounded-full">{tv("type", venue.type)}</span>
                {venue.verification_status === "verified" && (
                  <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{t.detail.verifiedBadge}</span>
                )}
              </div>
              <h1 className="font-display text-3xl md:text-4xl text-cream mt-3">{venue.name}</h1>
              <p className="text-cream/60 mt-1">{venue.area}, {venue.city}</p>
            </div>
            {venue.rating > 0 && (
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 justify-end text-brass-deep font-semibold">
                  ★ {venue.rating}
                </div>
                {venue.reviews > 0 && <p className="text-xs text-cream/50">{venue.reviews} reviews</p>}
              </div>
            )}
          </div>

          <p className="text-cream/70 leading-relaxed mt-6">{venue.description}</p>

          {/* Key facts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            <Fact label={t.detail.capacity} value={t.detail.capacityValue.replace("{min}", venue.capacityMin).replace("{max}", venue.capacityMax)} />
            <Fact label={t.detail.halls} value={venue.halls} />
            <Fact label={t.detail.venueSize} value={`${venue.venueSize} m²`} />
            <Fact label={t.detail.setting} value={tv("setting", venue.indoorOutdoor)} />
          </div>

          {/* Amenities */}
          <div className="mt-10">
            <h2 className="font-display text-xl text-cream mb-4">{t.detail.amenitiesTitle}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {activeAmenities.length === 0 && <p className="text-sm text-cream/50">{t.detail.noAmenities}</p>}
              {activeAmenities.map((k) => (
                <div key={k} className="flex items-center gap-2 text-sm text-cream/70">
                  <span className="text-emerald">✓</span> {amenityLabels[k]}
                </div>
              ))}
            </div>
          </div>

          {/* Suitable for */}
          <div className="mt-10">
            <h2 className="font-display text-xl text-cream mb-4">{t.detail.suitableForTitle}</h2>
            <div className="flex gap-2 flex-wrap">
              {(venue.suitableFor || []).map((e) => (
                <span key={e} className="text-sm bg-surface border border-hair px-3 py-1.5 rounded-full text-cream/70">{tv("event", e)}</span>
              ))}
            </div>
          </div>

          {/* Disclaimer + report */}
          <div className="mt-10 bg-surface border border-hair rounded-2xl p-5">
            <p className="text-sm text-cream/60 leading-relaxed">
              {t.detail.disclaimer}
            </p>
            <ReportVenue venueId={venue.id} />
          </div>
        </div>

        {/* Sticky lead form */}
        <div>
          <div className="sticky top-24 bg-surface border border-hair rounded-2xl p-6">
            <p className="text-sm text-cream/50 mb-1">{t.detail.startingPrice}</p>
            <p className="font-display text-2xl text-emerald mb-5">{venue.startingPrice.toLocaleString()} EGP</p>
            <h3 className="font-semibold text-cream mb-4">{t.detail.sendInquiryTitle}</h3>
            <LeadForm venueId={venue.id} venueName={venue.name} />
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
