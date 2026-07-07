"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useI18n } from "@/lib/i18n/client";
import {
  compressImageToFit, MAX_IMAGE_BYTES, MAX_DOC_BYTES, MAX_IMAGES, MAX_DOCS, formatMB,
} from "@/lib/upload";

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80";

// Upload selected files to Supabase Storage and return their public URLs.
// Falls back to [] if Supabase isn't configured. Large photos are optimised
// (downscaled + re-encoded) client-side to fit MAX_IMAGE_BYTES without visible
// quality loss; anything that still exceeds the limit throws `oversizeError`.
async function uploadImages(files, oversizeError) {
  if (!files || files.length === 0) return [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  if (files.length > MAX_IMAGES) throw new Error("__count_images__");
  const supabase = createSupabaseBrowserClient();
  const urls = [];
  for (const original of files) {
    const file = await compressImageToFit(original, { maxBytes: MAX_IMAGE_BYTES });
    if (file.size > MAX_IMAGE_BYTES) throw new Error(oversizeError);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("venue-images")
      .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from("venue-images").getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

// Upload OPTIONAL verification proof to the PRIVATE `venue-docs` bucket. These are
// NOT public — only admins can read them (via signed URLs). Returns object paths
// (not public URLs). Separate from venue Photos above.
async function uploadProofDocs(files, oversizeError) {
  if (!files || files.length === 0) return [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  if (files.length > MAX_DOCS) throw new Error("__count_docs__");
  const supabase = createSupabaseBrowserClient();
  const paths = [];
  for (const file of files) {
    // Documents (incl. PDFs) are uploaded as-is — validate size, never re-encode.
    if (file.size > MAX_DOC_BYTES) throw new Error(oversizeError);
    const ext = (file.name.split(".").pop() || "dat").toLowerCase();
    const path = `proof/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("venue-docs")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    paths.push(path);
  }
  return paths;
}

const AMENITY_KEYS = ["catering", "parking", "bridalRoom", "dj", "decoration", "kidsArea", "ac", "valet"];

function AddVenueInner() {
  const { t, tv, locale } = useI18n();
  const ta = t.addVenue;
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [cats, setCats] = useState([]);
  const [govs, setGovs] = useState([]);
  const [cities, setCities] = useState([]);
  const [category, setCategory] = useState("venues");
  const [governorate, setGovernorate] = useState("");
  const params = useSearchParams();

  // Load categories + locations for the selectors.
  useEffect(() => {
    fetch("/api/categories").then((r) => (r.ok ? r.json() : [])).then(setCats).catch(() => {});
    fetch("/api/locations").then((r) => (r.ok ? r.json() : { governorates: [], cities: [] }))
      .then((d) => { setGovs(d.governorates || []); setCities(d.cities || []); }).catch(() => {});
  }, []);
  const cityOptions = cities.filter((c) => !governorate || c.governorate_id === governorate);
  const isVenue = category === "venues";
  // Outreach attribution (from WhatsApp registration links).
  const source = params.get("source") === "whatsapp" ? "whatsapp_outreach" : "public";
  const prospectId = params.get("prospect_id") || "";

  // Track that a WhatsApp prospect opened the registration link (best-effort).
  useEffect(() => {
    if (prospectId) {
      fetch("/api/outreach/register-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospect_id: prospectId }),
      }).catch(() => {});
    }
  }, [prospectId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    const f = e.target;

    // Client-side sanity checks beyond the HTML `required` attributes.
    const priceMin = Number(f.price_min?.value || 0);
    const priceMax = Number(f.price_max?.value || 0);
    if (priceMin <= 0) {
      setStatus("error");
      setErrorMsg(ta.errPrice);
      return;
    }
    if (isVenue) {
      const capMin = Number(f.capacityMin?.value || 0);
      const capMax = Number(f.capacityMax?.value || 0);
      if (capMax < capMin) {
        setStatus("error");
        setErrorMsg(ta.errCapacity);
        return;
      }
    }
    // Required authorization confirmation.
    if (!f.authorization.checked) {
      setStatus("error");
      setErrorMsg(ta.errAuth);
      return;
    }

    setStatus("sending");
    try {
      let images;
      try {
        const uploaded = await uploadImages(f.images.files, ta.errImages);
        images = uploaded.length > 0 ? uploaded : [PLACEHOLDER_IMAGE];
      } catch (e) {
        throw new Error(e.message === "__count_images__" ? ta.errTooManyImages : ta.errImages);
      }

      // Optional, private verification proof (separate from public Photos).
      let verification_docs = [];
      try {
        verification_docs = await uploadProofDocs(f.proof.files, ta.errProof);
      } catch (e) {
        throw new Error(e.message === "__count_docs__" ? ta.errTooManyDocs : ta.errProof);
      }

      const payload = {
        name: f.name.value,
        category_id: category,
        city: f.city.value,
        area: f.area.value,
        governorate_id: f.governorate_id?.value || undefined,
        city_id: f.city_id?.value || undefined,
        price_min: priceMin,
        price_max: priceMax || undefined,
        description: f.description.value,
        images,
        // Contact / proof details for admin verification (optional).
        owner_name: f.owner_name.value,
        owner_role: f.owner_role.value,
        owner_email: f.owner_email.value,
        owner_phone: f.owner_phone.value,
        owner_whatsapp: f.owner_whatsapp.value,
        official_website: f.official_website.value,
        google_maps_link: f.google_maps_link.value,
        social_link: f.social_link.value,
        // Authorization confirmation + optional private proof doc paths.
        authorization_confirmed: true,
        verification_docs,
        // Outreach attribution (server forces moderation status regardless).
        source,
        prospect_id: prospectId || undefined,
      };
      // Venue-specific fields only apply to the Venues category.
      if (isVenue) {
        Object.assign(payload, {
          type: f.type.value,
          indoorOutdoor: f.indoorOutdoor.value,
          capacityMin: Number(f.capacityMin?.value || 0),
          capacityMax: Number(f.capacityMax?.value || 0),
          startingPrice: priceMin,
          halls: Number(f.halls?.value || 1),
          venueSize: Number(f.venueSize?.value || 0),
          suitableFor: f.suitableFor ? Array.from(f.suitableFor.selectedOptions).map((o) => o.value) : [],
          ...AMENITY_KEYS.reduce((acc, key) => ({ ...acc, [key]: f[key]?.checked || false }), {}),
        });
      } else {
        payload.startingPrice = priceMin; // keep legacy column populated
      }
      const res = await fetch("/api/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || ta.errSave);
      }
      setStatus("sent");
      f.reset();
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || ta.errGeneric);
    }
  }

  if (status === "sent") {
    return (
      <div className="max-w-xl mx-auto px-5 py-24 text-center">
        <h1 className="font-display text-3xl text-emerald mb-3">{ta.sentTitle}</h1>
        <p className="text-cream/60">
          {ta.sentBody}
        </p>
        <Link href="/venues" className="inline-block mt-6 text-sm font-semibold bg-emerald text-onnight px-6 py-3 rounded-full hover:opacity-90 transition">
          {ta.browse}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-14">
      <p className="text-brass-deep text-sm font-semibold uppercase tracking-wide mb-2">{ta.eyebrow}</p>
      <h1 className="font-display text-3xl text-cream mb-2">{ta.title}</h1>
      <p className="text-cream/60 mb-8">{ta.subtitle}</p>

      <form onSubmit={handleSubmit} className="space-y-5 bg-surface border border-hair rounded-2xl p-6 md:p-8">
        <Field label={ta.venueName} name="name" required />

        {/* Category */}
        <div>
          <Label>{ta.category}</Label>
          <select name="category_id" value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface">
            {cats.map((c) => <option key={c.id} value={c.id}>{locale === "ar" ? c.name_ar : c.name_en}</option>)}
          </select>
        </div>

        {/* Location (governorate + city from the reference tables) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>{ta.governorate}</Label>
            <select name="governorate_id" value={governorate} onChange={(e) => setGovernorate(e.target.value)}
              className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface">
              <option value="">—</option>
              {govs.map((g) => <option key={g.id} value={g.id}>{locale === "ar" ? g.name_ar : g.name_en}</option>)}
            </select>
          </div>
          <div>
            <Label>{ta.cityArea}</Label>
            <select name="city_id" className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface">
              <option value="">—</option>
              {cityOptions.map((c) => <option key={c.id} value={c.id}>{locale === "ar" ? c.name_ar : c.name_en}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={ta.city} name="city" required />
          <Field label={ta.area} name="area" required />
        </div>

        {/* Price (all categories) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={ta.startingPrice} name="price_min" type="number" required />
          <Field label={ta.priceMax} name="price_max" type="number" />
        </div>

        {/* Venue-only fields */}
        {isVenue && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{ta.venueType}</Label>
                <select name="type" className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface">
                  {["Hotel", "Hall", "Garden", "Villa", "Rooftop", "Restaurant"].map((v) => <option key={v} value={v}>{tv("type", v)}</option>)}
                </select>
              </div>
              <div>
                <Label>{ta.setting}</Label>
                <select name="indoorOutdoor" className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface">
                  {["Indoor", "Outdoor", "Both"].map((v) => <option key={v} value={v}>{tv("setting", v)}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={ta.minCapacity} name="capacityMin" type="number" />
              <Field label={ta.maxCapacity} name="capacityMax" type="number" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={ta.halls} name="halls" type="number" />
              <Field label={ta.venueSize} name="venueSize" type="number" />
            </div>
            <div>
              <Label>{ta.suitableFor}</Label>
              <select name="suitableFor" multiple className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface h-28">
                {["Wedding", "Engagement", "Birthday", "Corporate Event"].map((e) => <option key={e} value={e}>{tv("event", e)}</option>)}
              </select>
            </div>
          </>
        )}

        <div>
          <Label>{ta.description}</Label>
          <textarea name="description" rows={4} required className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm" />
        </div>

        <div>
          <Label>{ta.photos}</Label>
          <input
            name="images"
            type="file"
            accept="image/*"
            multiple
            className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface file:me-3 file:rounded-full file:border-0 file:bg-emerald file:text-cream file:px-3 file:py-1.5 file:text-xs file:font-semibold"
          />
          <p className="text-xs text-cream/40 mt-1">{ta.photosHint}</p>
        </div>

        {isVenue && (
          <div>
            <Label>{ta.amenities}</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {AMENITY_KEYS.map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm text-cream/70">
                  <input type="checkbox" name={key} className="accent-emerald" />
                  {t.detail.amenityLabels[key]}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-hair pt-5">
          <Label>{ta.ownerDetails}</Label>
          <p className="text-xs text-cream/40 mb-3">{ta.ownerHint}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={ta.ownerName} name="owner_name" />
            <Field label={ta.ownerRole} name="owner_role" />
            <Field label={ta.ownerEmail} name="owner_email" type="email" />
            <Field label={ta.ownerPhone} name="owner_phone" type="tel" />
            <Field label={ta.ownerWhatsapp} name="owner_whatsapp" type="tel" />
            <Field label={ta.officialWebsite} name="official_website" />
            <Field label={ta.googleMaps} name="google_maps_link" />
          </div>
          <div className="mt-4">
            <Field label={ta.socialLink} name="social_link" />
          </div>

          <div className="mt-4">
            <Label>{ta.proof}</Label>
            <input
              name="proof"
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface file:me-3 file:rounded-full file:border-0 file:bg-night file:text-cream file:px-3 file:py-1.5 file:text-xs file:font-semibold"
            />
            <p className="text-xs text-cream/40 mt-1">
              {ta.proofHint}
            </p>
          </div>
        </div>

        <p className="text-xs text-cream/50 bg-night/5 rounded-lg p-3">
          {ta.moderationNote}
        </p>

        <label className="flex items-start gap-2.5 text-sm text-cream/70">
          <input type="checkbox" name="authorization" required className="accent-emerald mt-0.5" />
          <span>
            {ta.authConfirm} <span className="text-red-500">*</span>
          </span>
        </label>

        <button
          disabled={status === "sending"}
          className="w-full bg-emerald text-onnight font-semibold py-3.5 rounded-full hover:opacity-90 transition disabled:opacity-50"
        >
          {status === "sending" ? ta.submitting : ta.submit}
        </button>
        {status === "error" && <p className="text-sm text-red-600 text-center">{errorMsg || ta.errGeneric}</p>}
      </form>
    </div>
  );
}

export default function AddVenuePage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-5 py-14 text-cream/50">…</div>}>
      <AddVenueInner />
    </Suspense>
  );
}

function Label({ children }) {
  return <label className="text-sm font-medium text-cream/70 block mb-1.5">{children}</label>;
}

function Field({ label, name, type = "text", required }) {
  return (
    <div>
      <Label>{label}</Label>
      <input name={name} type={type} required={required} className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm" />
    </div>
  );
}
