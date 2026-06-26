import { getVenueById } from "@/lib/data";
import LeadForm from "@/components/LeadForm";
import ReportVenue from "@/components/ReportVenue";
import { notFound } from "next/navigation";

const AMENITY_LABELS = {
  catering: "Catering",
  parking: "Parking",
  bridalRoom: "Bridal room",
  dj: "DJ / sound system",
  decoration: "Decoration included",
  kidsArea: "Kids area",
  ac: "Air conditioning",
  valet: "Valet parking",
};

export const dynamic = "force-dynamic";

export default async function VenueDetailsPage({ params }) {
  const { id } = await params;
  const venue = await getVenueById(id);
  if (!venue) return notFound();

  const activeAmenities = Object.keys(AMENITY_LABELS).filter((k) => venue[k]);

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
                <span className="text-xs font-semibold bg-emerald/10 text-emerald px-3 py-1 rounded-full">{venue.type}</span>
                {venue.verification_status === "verified" && (
                  <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">✓ Verified by Zafah</span>
                )}
              </div>
              <h1 className="font-display text-3xl md:text-4xl text-ink mt-3">{venue.name}</h1>
              <p className="text-ink/60 mt-1">{venue.area}, {venue.city}</p>
            </div>
            {venue.rating > 0 && (
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 justify-end text-brass-deep font-semibold">
                  ★ {venue.rating}
                </div>
                {venue.reviews > 0 && <p className="text-xs text-ink/50">{venue.reviews} reviews</p>}
              </div>
            )}
          </div>

          <p className="text-ink/70 leading-relaxed mt-6">{venue.description}</p>

          {/* Key facts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            <Fact label="Capacity" value={`${venue.capacityMin}–${venue.capacityMax} guests`} />
            <Fact label="Halls" value={venue.halls} />
            <Fact label="Venue size" value={`${venue.venueSize} m²`} />
            <Fact label="Setting" value={venue.indoorOutdoor} />
          </div>

          {/* Amenities */}
          <div className="mt-10">
            <h2 className="font-display text-xl text-ink mb-4">Amenities</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {activeAmenities.length === 0 && <p className="text-sm text-ink/50">No amenities listed yet.</p>}
              {activeAmenities.map((k) => (
                <div key={k} className="flex items-center gap-2 text-sm text-ink/70">
                  <span className="text-emerald">✓</span> {AMENITY_LABELS[k]}
                </div>
              ))}
            </div>
          </div>

          {/* Suitable for */}
          <div className="mt-10">
            <h2 className="font-display text-xl text-ink mb-4">Suitable for</h2>
            <div className="flex gap-2 flex-wrap">
              {(venue.suitableFor || []).map((e) => (
                <span key={e} className="text-sm bg-white border border-line px-3 py-1.5 rounded-full text-ink/70">{e}</span>
              ))}
            </div>
          </div>

          {/* Disclaimer + report */}
          <div className="mt-10 bg-white border border-line rounded-2xl p-5">
            <p className="text-sm text-ink/60 leading-relaxed">
              Zafah helps you discover and contact venues. Confirm availability, prices, contracts, and
              payment terms directly with the venue before making any payment.
            </p>
            <p className="text-sm text-ink/60 leading-relaxed mt-2" dir="rtl">
              Zafah — الزفة تساعدك على اكتشاف أماكن المناسبات والتواصل معها. تأكد من التوافر والأسعار وشروط
              الحجز والدفع مباشرةً مع المكان قبل دفع أي مبالغ.
            </p>
            <ReportVenue venueId={venue.id} />
          </div>
        </div>

        {/* Sticky lead form */}
        <div>
          <div className="sticky top-24 bg-white border border-line rounded-2xl p-6">
            <p className="text-sm text-ink/50 mb-1">Starting price</p>
            <p className="font-display text-2xl text-emerald mb-5">{venue.startingPrice.toLocaleString()} EGP</p>
            <h3 className="font-semibold text-ink mb-4">Send a booking inquiry</h3>
            <LeadForm venueId={venue.id} venueName={venue.name} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div className="bg-white border border-line rounded-xl p-4">
      <p className="text-xs text-ink/50 mb-1">{label}</p>
      <p className="font-semibold text-ink">{value}</p>
    </div>
  );
}
