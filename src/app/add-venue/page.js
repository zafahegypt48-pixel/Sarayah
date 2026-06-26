"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80";

// Upload selected files to Supabase Storage and return their public URLs.
// Falls back to [] if Supabase isn't configured or any upload fails.
async function uploadImages(files) {
  if (!files || files.length === 0) return [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = createSupabaseBrowserClient();
  const urls = [];
  for (const file of files) {
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("venue-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from("venue-images").getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

// Upload OPTIONAL verification proof to the PRIVATE `venue-docs` bucket. These are
// NOT public — only admins can read them (via signed URLs). Returns object paths
// (not public URLs). Separate from venue Photos above.
async function uploadProofDocs(files) {
  if (!files || files.length === 0) return [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = createSupabaseBrowserClient();
  const paths = [];
  for (const file of files) {
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

const AMENITIES = [
  ["catering", "Catering"],
  ["parking", "Parking"],
  ["bridalRoom", "Bridal room"],
  ["dj", "DJ / sound system"],
  ["decoration", "Decoration included"],
  ["kidsArea", "Kids area"],
  ["ac", "Air conditioning"],
  ["valet", "Valet parking"],
];

function AddVenueInner() {
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const params = useSearchParams();
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
    const capacityMin = Number(f.capacityMin.value || 0);
    const capacityMax = Number(f.capacityMax.value || 0);
    const startingPrice = Number(f.startingPrice.value || 0);
    if (capacityMax < capacityMin) {
      setStatus("error");
      setErrorMsg("Max capacity must be greater than or equal to min capacity.");
      return;
    }
    if (startingPrice <= 0) {
      setStatus("error");
      setErrorMsg("Please enter a starting price greater than 0.");
      return;
    }
    // Required authorization confirmation.
    if (!f.authorization.checked) {
      setStatus("error");
      setErrorMsg("Please confirm that you are the owner or an authorized representative of this venue.");
      return;
    }

    setStatus("sending");
    try {
      let images;
      try {
        const uploaded = await uploadImages(f.images.files);
        images = uploaded.length > 0 ? uploaded : [PLACEHOLDER_IMAGE];
      } catch {
        throw new Error("Image upload failed. Please try smaller images or remove them and try again.");
      }

      // Optional, private verification proof (separate from public Photos).
      let verification_docs = [];
      try {
        verification_docs = await uploadProofDocs(f.proof.files);
      } catch {
        throw new Error("Verification proof upload failed (max 5MB, image or PDF). Remove it or try again.");
      }

      const payload = {
        name: f.name.value,
        type: f.type.value,
        city: f.city.value,
        area: f.area.value,
        indoorOutdoor: f.indoorOutdoor.value,
        capacityMin,
        capacityMax,
        startingPrice,
        halls: Number(f.halls.value || 1),
        venueSize: Number(f.venueSize.value || 0),
        description: f.description.value,
        suitableFor: Array.from(f.suitableFor.selectedOptions).map((o) => o.value),
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
        ...AMENITIES.reduce((acc, [key]) => ({ ...acc, [key]: f[key]?.checked || false }), {}),
      };
      const res = await fetch("/api/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not save the venue. Please try again.");
      }
      setStatus("sent");
      f.reset();
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    }
  }

  if (status === "sent") {
    return (
      <div className="max-w-xl mx-auto px-5 py-24 text-center">
        <h1 className="font-display text-3xl text-emerald mb-3">Submitted for review</h1>
        <p className="text-ink/60">
          Your venue has been submitted and is pending admin review. It will appear publicly once
          our team approves it. We may contact you to verify ownership. Listing is free during launch.
        </p>
        <Link href="/venues" className="inline-block mt-6 text-sm font-semibold bg-emerald text-ivory px-6 py-3 rounded-full hover:opacity-90 transition">
          Browse venues
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-14">
      <p className="text-brass-deep text-sm font-semibold uppercase tracking-wide mb-2">For venue owners</p>
      <h1 className="font-display text-3xl text-ink mb-2">List your venue</h1>
      <p className="text-ink/60 mb-8">Free during launch. Takes about 3 minutes. Submissions are reviewed before going live.</p>

      <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-line rounded-2xl p-6 md:p-8">
        <Field label="Venue name" name="name" required />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Venue type</Label>
            <select name="type" required className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white">
              {["Hotel", "Hall", "Garden", "Villa", "Rooftop", "Restaurant"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <Label>Indoor / Outdoor</Label>
            <select name="indoorOutdoor" required className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white">
              <option>Indoor</option><option>Outdoor</option><option>Both</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="City" name="city" required />
          <Field label="Area" name="area" required />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Min capacity" name="capacityMin" type="number" required />
          <Field label="Max capacity" name="capacityMax" type="number" required />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Starting price (EGP)" name="startingPrice" type="number" required />
          <Field label="Number of halls" name="halls" type="number" />
        </div>

        <Field label="Venue size (m²)" name="venueSize" type="number" />

        <div>
          <Label>Suitable for (select all that apply)</Label>
          <select name="suitableFor" multiple className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white h-28">
            {["Wedding", "Engagement", "Birthday", "Corporate Event"].map((e) => <option key={e}>{e}</option>)}
          </select>
        </div>

        <div>
          <Label>Description</Label>
          <textarea name="description" rows={4} required className="w-full border border-line rounded-lg px-3 py-2.5 text-sm" />
        </div>

        <div>
          <Label>Photos</Label>
          <input
            name="images"
            type="file"
            accept="image/*"
            multiple
            className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white file:mr-3 file:rounded-full file:border-0 file:bg-emerald file:text-ivory file:px-3 file:py-1.5 file:text-xs file:font-semibold"
          />
          <p className="text-xs text-ink/40 mt-1">Upload one or more photos. If you skip this, we&apos;ll use a placeholder you can replace later.</p>
        </div>

        <div>
          <Label>Amenities</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {AMENITIES.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-ink/70">
                <input type="checkbox" name={key} className="accent-emerald" />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="border-t border-line pt-5">
          <Label>Your details (helps us verify ownership)</Label>
          <p className="text-xs text-ink/40 mb-3">Optional, but listings with verifiable details get approved faster. Never shown publicly.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Your name" name="owner_name" />
            <Field label="Your role (owner, manager…)" name="owner_role" />
            <Field label="Business email" name="owner_email" type="email" />
            <Field label="Phone" name="owner_phone" type="tel" />
            <Field label="WhatsApp number" name="owner_whatsapp" type="tel" />
            <Field label="Official website" name="official_website" />
            <Field label="Google Maps link" name="google_maps_link" />
          </div>
          <div className="mt-4">
            <Field label="Social media link (Instagram/Facebook)" name="social_link" />
          </div>

          <div className="mt-4">
            <Label>Verification proof (optional)</Label>
            <input
              name="proof"
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white file:mr-3 file:rounded-full file:border-0 file:bg-ink file:text-ivory file:px-3 file:py-1.5 file:text-xs file:font-semibold"
            />
            <p className="text-xs text-ink/40 mt-1">
              Optional — only used for verification, never shown publicly. (Business card, authorization
              letter, or similar — image or PDF, max 5MB each. Separate from the venue Photos above.)
            </p>
            <p className="text-xs text-ink/40 mt-1" dir="rtl">
              اختياري — يُستخدم فقط للمراجعة والتوثيق، ولن يظهر للعامة.
            </p>
          </div>
        </div>

        <p className="text-xs text-ink/50 bg-ink/5 rounded-lg p-3">
          Submissions are reviewed by our team before appearing publicly. Don&apos;t list a venue you don&apos;t own or represent — fake or impersonated listings are removed.
        </p>

        <label className="flex items-start gap-2.5 text-sm text-ink/70">
          <input type="checkbox" name="authorization" required className="accent-emerald mt-0.5" />
          <span>
            I confirm that I am the owner or an authorized representative of this venue, and that the
            information provided is accurate. <span className="text-red-500">*</span>
          </span>
        </label>

        <button
          disabled={status === "sending"}
          className="w-full bg-ink text-ivory font-semibold py-3.5 rounded-full hover:bg-emerald transition disabled:opacity-50"
        >
          {status === "sending" ? "Submitting…" : "Submit venue for review"}
        </button>
        {status === "error" && <p className="text-sm text-red-600 text-center">{errorMsg || "Something went wrong. Please try again."}</p>}
      </form>
    </div>
  );
}

export default function AddVenuePage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-5 py-14 text-ink/50">Loading…</div>}>
      <AddVenueInner />
    </Suspense>
  );
}

function Label({ children }) {
  return <label className="text-sm font-medium text-ink/70 block mb-1.5">{children}</label>;
}

function Field({ label, name, type = "text", required }) {
  return (
    <div>
      <Label>{label}</Label>
      <input name={name} type={type} required={required} className="w-full border border-line rounded-lg px-3 py-2.5 text-sm" />
    </div>
  );
}
