"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useI18n } from "@/lib/i18n/client";
import {
  compressImageToFit, isAllowedImageType, MAX_IMAGE_BYTES, MAX_DOC_BYTES, MAX_IMAGES, MAX_DOCS,
} from "@/lib/upload";

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80";

// Versioned draft key — bump the suffix if the field shape changes so old drafts
// are ignored rather than mis-restored.
const DRAFT_KEY = "sarayah_add_venue_draft_v1";

function readDraft() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : null;
  } catch {
    return null;
  }
}
function writeDraft(data) {
  if (typeof window === "undefined") return;
  try {
    // Only persist once the user has typed something meaningful, so an untouched
    // visit (which still has default select values) doesn't leave a stale draft.
    const meaningful = ["name", "description", "city", "area", "price_min", "owner_name", "owner_phone", "owner_email"];
    const hasContent = meaningful.some((k) => data[k] && String(data[k]).trim());
    if (hasContent) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch { /* quota / private mode — ignore, autosave is best-effort */ }
}
function clearDraft() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

// Snapshot the form's text/select/checkbox values (NEVER files, never the legal
// authorization checkbox). Used for localStorage autosave.
function serializeForm(formEl) {
  const out = {};
  for (const el of formEl.elements) {
    if (!el.name || el.name === "authorization") continue;
    if (el.type === "file" || el.type === "submit" || el.type === "button") continue;
    if (el.type === "checkbox") out[el.name] = el.checked;
    else if (el.multiple && el.tagName === "SELECT") out[el.name] = Array.from(el.selectedOptions).map((o) => o.value);
    else out[el.name] = el.value;
  }
  return out;
}

// Upload ONE already-processed image file to the public venue-images bucket and
// return its public URL. Per-file so one failure never aborts the others.
async function putImage(supabase, file) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("venue-images")
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from("venue-images").getPublicUrl(path).data.publicUrl;
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

  // Draft restore gating: render the form only once we've read localStorage, so
  // defaultValue on every field can seed from the saved draft on mount.
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState({});
  const [draftRestored, setDraftRestored] = useState(false);

  // Managed image state — [{ id, key, name, file, previewUrl, status, error, uploadedUrl }]
  const [images, setImages] = useState([]);
  const [imgBusy, setImgBusy] = useState(0); // # of files still being processed
  const [imgNote, setImgNote] = useState("");
  const imagesRef = useRef([]);
  const formRef = useRef(null);
  const saveTimer = useRef(null);
  useEffect(() => { imagesRef.current = images; }, [images]);

  // Load categories + locations for the selectors.
  useEffect(() => {
    fetch("/api/categories").then((r) => (r.ok ? r.json() : [])).then(setCats).catch(() => {});
    fetch("/api/locations").then((r) => (r.ok ? r.json() : { governorates: [], cities: [] }))
      .then((d) => { setGovs(d.governorates || []); setCities(d.cities || []); }).catch(() => {});
  }, []);

  // Restore an in-progress draft (client only). category/governorate are
  // controlled selects, so they restore into state; every other field restores
  // via defaultValue once `ready` flips true.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from localStorage on mount */
    const d = readDraft();
    if (d) {
      if (d.category_id) setCategory(d.category_id);
      if (d.governorate_id) setGovernorate(d.governorate_id);
      setDraft(d);
      setDraftRestored(true);
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Revoke all preview object URLs on unmount (avoid memory leaks). Reads the ref
  // so it always sees the latest list.
  useEffect(() => () => {
    imagesRef.current.forEach((x) => x.previewUrl && URL.revokeObjectURL(x.previewUrl));
  }, []);

  // Persist the draft when the tab is hidden/closed (covers the mobile case where
  // opening the camera backgrounds and reloads the tab).
  useEffect(() => {
    const save = () => { if (formRef.current) writeDraft(serializeForm(formRef.current)); };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", save);
    return () => {
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", save);
    };
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

  // Debounced autosave on any field edit.
  function scheduleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (formRef.current) writeDraft(serializeForm(formRef.current));
    }, 500);
  }

  // Process one accepted image: optimise/convert as needed, then flip its status.
  // Fully isolated — a failure here never touches the other images.
  async function processImage(item) {
    try {
      const allowed = isAllowedImageType(item.file.type);
      const optimized = await compressImageToFit(item.file, {
        maxBytes: MAX_IMAGE_BYTES,
        // Convert decodable-but-unsupported types (HEIC/BMP/…) to WebP; never
        // re-encode GIFs (would drop animation).
        reencodeAlways: !allowed && item.file.type !== "image/gif",
      });
      let error = "";
      if (optimized.size > MAX_IMAGE_BYTES) {
        error = ta.photosTooLarge.replace("{name}", item.name);
      } else if (!isAllowedImageType(optimized.type)) {
        error = ta.photosUnsupported.replace("{name}", item.name);
      }
      setImages((prev) => prev.map((x) =>
        x.id === item.id ? { ...x, file: optimized, status: error ? "error" : "ready", error } : x));
    } catch {
      setImages((prev) => prev.map((x) =>
        x.id === item.id ? { ...x, status: "error", error: ta.photosProcessFail.replace("{name}", item.name) } : x));
    } finally {
      setImgBusy((b) => Math.max(0, b - 1));
    }
  }

  // Handle a batch (or single) file selection. Appends to existing photos, dedupes
  // identical files, enforces the 12-image cap, and starts async processing.
  function onSelectImages(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = ""; // reset so re-picking the same file fires change again
    if (picked.length === 0) return;

    const current = imagesRef.current;
    const remaining = MAX_IMAGES - current.length;
    if (remaining <= 0) { setImgNote(ta.photosLimitReached); return; }

    const seen = new Set(current.map((it) => it.key));
    const notes = [];
    const accepted = [];
    for (const file of picked) {
      if (accepted.length >= remaining) break;
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (seen.has(key)) continue; // ignore duplicate / double-tap of same file
      if (!file.type.startsWith("image/")) {
        notes.push(ta.photosUnsupported.replace("{name}", file.name));
        continue;
      }
      seen.add(key);
      accepted.push({
        id: crypto.randomUUID(),
        key,
        name: file.name,
        file,
        previewUrl: URL.createObjectURL(file),
        status: "processing",
        error: "",
        uploadedUrl: "",
      });
    }
    const overflow = picked.filter((f) => f.type.startsWith("image/")).length - remaining;
    if (overflow > 0) {
      notes.push(ta.photosLimitTrimmed.replace("{n}", String(remaining)).replace("{s}", remaining === 1 ? "" : "s"));
    }
    setImgNote(notes.join(" "));
    if (accepted.length === 0) return;

    setImages((prev) => [...prev, ...accepted]);
    setImgBusy((b) => b + accepted.length);
    accepted.forEach((item) => processImage(item));
  }

  function removeImage(id) {
    const found = imagesRef.current.find((x) => x.id === id);
    if (found?.previewUrl) URL.revokeObjectURL(found.previewUrl);
    setImages((prev) => prev.filter((x) => x.id !== id));
    setImgNote("");
  }

  function resetFormAndImages() {
    imagesRef.current.forEach((x) => x.previewUrl && URL.revokeObjectURL(x.previewUrl));
    setImages([]);
    setImgNote("");
    formRef.current?.reset();
  }

  function discardDraft() {
    clearDraft();
    setDraftRestored(false);
    setDraft({});
    setCategory("venues");
    setGovernorate("");
    resetFormAndImages();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    const f = e.target;

    // Client-side sanity checks beyond the HTML `required` attributes. These
    // early returns NEVER touch entered data or selected photos.
    const priceMin = Number(f.price_min?.value || 0);
    const priceMax = Number(f.price_max?.value || 0);
    if (priceMin <= 0) { setStatus("error"); setErrorMsg(ta.errPrice); return; }
    if (isVenue) {
      const capMin = Number(f.capacityMin?.value || 0);
      const capMax = Number(f.capacityMax?.value || 0);
      if (capMax < capMin) { setStatus("error"); setErrorMsg(ta.errCapacity); return; }
    }
    if (!f.authorization.checked) { setStatus("error"); setErrorMsg(ta.errAuth); return; }

    // Photo guards: don't submit mid-processing or with failed photos.
    if (imgBusy > 0) { setStatus("error"); setErrorMsg(ta.photosStillProcessing); return; }
    if (imagesRef.current.some((x) => x.status === "error")) {
      setStatus("error"); setErrorMsg(ta.photosFixErrors); return;
    }

    setStatus("sending");
    try {
      // Upload photos one by one. Already-uploaded ones (from a previous failed
      // attempt) are skipped so a retry never re-uploads or duplicates.
      let images = [PLACEHOLDER_IMAGE];
      const items = imagesRef.current;
      if (items.length > 0) {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
          images = [PLACEHOLDER_IMAGE];
        } else {
          const supabase = createSupabaseBrowserClient();
          const urls = [];
          const failed = [];
          for (const item of items) {
            if (item.uploadedUrl) { urls.push(item.uploadedUrl); continue; }
            try {
              const url = await putImage(supabase, item.file);
              urls.push(url);
              // Remember success so a later retry skips this file.
              setImages((prev) => prev.map((x) => (x.id === item.id ? { ...x, uploadedUrl: url } : x)));
            } catch {
              failed.push(item.name);
            }
          }
          if (failed.length > 0) {
            throw new Error(ta.photosUploadFailed.replace("{n}", String(failed.length)).replace("{s}", failed.length === 1 ? "" : "s"));
          }
          images = urls.length > 0 ? urls : [PLACEHOLDER_IMAGE];
        }
      }

      // Optional, private verification proof (separate from public Photos).
      let verification_docs = [];
      try {
        verification_docs = await uploadProofDocs(f.proof.files, ta.errProof);
      } catch (e2) {
        throw new Error(e2.message === "__count_docs__" ? ta.errTooManyDocs : ta.errProof);
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
      // Success ONLY now: clear the draft + wipe the form + photos.
      clearDraft();
      resetFormAndImages();
      setStatus("sent");
    } catch (err) {
      // Any failure preserves the form, the draft, and the (uploaded) photos.
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

  if (!ready) {
    return <div className="max-w-2xl mx-auto px-5 py-14 text-cream/50">{ta.loading}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-14">
      <p className="text-brass-deep text-sm font-semibold uppercase tracking-wide mb-2">{ta.eyebrow}</p>
      <h1 className="font-display text-3xl text-cream mb-2">{ta.title}</h1>
      <p className="text-cream/60 mb-8">{ta.subtitle}</p>

      {draftRestored && (
        <div className="flex items-center justify-between gap-3 bg-emerald/10 border border-emerald/30 text-emerald rounded-xl px-4 py-2.5 mb-5 text-sm">
          <span>{ta.draftRestored}</span>
          <button type="button" onClick={discardDraft} className="text-xs font-semibold underline hover:no-underline shrink-0">
            {ta.draftDiscard}
          </button>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} onInput={scheduleSave} onChange={scheduleSave} className="space-y-5 bg-surface border border-hair rounded-2xl p-6 md:p-8">
        <Field label={ta.venueName} name="name" required defaultValue={draft.name} />

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
            <select name="city_id" defaultValue={draft.city_id} className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface">
              <option value="">—</option>
              {cityOptions.map((c) => <option key={c.id} value={c.id}>{locale === "ar" ? c.name_ar : c.name_en}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={ta.city} name="city" required defaultValue={draft.city} />
          <Field label={ta.area} name="area" required defaultValue={draft.area} />
        </div>

        {/* Price (all categories) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={ta.startingPrice} name="price_min" type="number" required defaultValue={draft.price_min} />
          <Field label={ta.priceMax} name="price_max" type="number" defaultValue={draft.price_max} />
        </div>

        {/* Venue-only fields */}
        {isVenue && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{ta.venueType}</Label>
                <select name="type" defaultValue={draft.type} className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface">
                  {["Hotel", "Hall", "Garden", "Villa", "Rooftop", "Restaurant"].map((v) => <option key={v} value={v}>{tv("type", v)}</option>)}
                </select>
              </div>
              <div>
                <Label>{ta.setting}</Label>
                <select name="indoorOutdoor" defaultValue={draft.indoorOutdoor} className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface">
                  {["Indoor", "Outdoor", "Both"].map((v) => <option key={v} value={v}>{tv("setting", v)}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={ta.minCapacity} name="capacityMin" type="number" defaultValue={draft.capacityMin} />
              <Field label={ta.maxCapacity} name="capacityMax" type="number" defaultValue={draft.capacityMax} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={ta.halls} name="halls" type="number" defaultValue={draft.halls} />
              <Field label={ta.venueSize} name="venueSize" type="number" defaultValue={draft.venueSize} />
            </div>
            <div>
              <Label>{ta.suitableFor}</Label>
              <select name="suitableFor" multiple defaultValue={draft.suitableFor || []} className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface h-28">
                {["Wedding", "Engagement", "Birthday", "Corporate Event"].map((e) => <option key={e} value={e}>{tv("event", e)}</option>)}
              </select>
            </div>
          </>
        )}

        <div>
          <Label>{ta.description}</Label>
          <textarea name="description" rows={4} required defaultValue={draft.description} className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm" />
        </div>

        {/* Photos — managed uploader with live previews */}
        <div>
          <Label>{ta.photos}</Label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={onSelectImages}
            disabled={images.length >= MAX_IMAGES}
            className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface file:me-3 file:rounded-full file:border-0 file:bg-emerald file:text-cream file:px-3 file:py-1.5 file:text-xs file:font-semibold disabled:opacity-50"
          />
          <div className="flex items-center justify-between gap-2 mt-1">
            <p className="text-xs text-cream/40">{ta.photosHint}</p>
            {images.length > 0 && (
              <span className="text-xs text-cream/50 shrink-0">{ta.photosCount.replace("{n}", String(images.length))}</span>
            )}
          </div>
          {imgBusy > 0 && (
            <p className="text-xs text-brass-deep mt-2">
              {ta.photosProcessing.replace("{n}", String(imgBusy)).replace("{s}", imgBusy === 1 ? "" : "s")}
            </p>
          )}
          {imgNote && <p className="text-xs text-red-600 mt-2">{imgNote}</p>}

          {images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
              {images.map((img) => (
                <div key={img.id} className={`relative aspect-square rounded-lg overflow-hidden border ${img.status === "error" ? "border-red-400" : "border-hair"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.previewUrl} alt={img.name} className="w-full h-full object-cover" />
                  {img.status !== "ready" && (
                    <div className={`absolute inset-0 flex items-center justify-center text-center px-1 text-[10px] font-semibold ${img.status === "error" ? "bg-red-900/60 text-white" : "bg-night/50 text-cream"}`}>
                      {img.status === "error" ? (img.error || ta.photoErrorBadge) : ta.photoProcessingBadge}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    aria-label={ta.removePhoto}
                    className="absolute top-1 end-1 w-6 h-6 rounded-full bg-night/70 text-white text-xs font-bold flex items-center justify-center hover:bg-red-600 transition"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {isVenue && (
          <div>
            <Label>{ta.amenities}</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {AMENITY_KEYS.map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm text-cream/70">
                  <input type="checkbox" name={key} defaultChecked={draft[key] === true} className="accent-emerald" />
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
            <Field label={ta.ownerName} name="owner_name" defaultValue={draft.owner_name} />
            <Field label={ta.ownerRole} name="owner_role" defaultValue={draft.owner_role} />
            <Field label={ta.ownerEmail} name="owner_email" type="email" defaultValue={draft.owner_email} />
            <Field label={ta.ownerPhone} name="owner_phone" type="tel" defaultValue={draft.owner_phone} />
            <Field label={ta.ownerWhatsapp} name="owner_whatsapp" type="tel" defaultValue={draft.owner_whatsapp} />
            <Field label={ta.officialWebsite} name="official_website" defaultValue={draft.official_website} />
            <Field label={ta.googleMaps} name="google_maps_link" defaultValue={draft.google_maps_link} />
          </div>
          <div className="mt-4">
            <Field label={ta.socialLink} name="social_link" defaultValue={draft.social_link} />
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
          disabled={status === "sending" || imgBusy > 0}
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

function Field({ label, name, type = "text", required, defaultValue }) {
  return (
    <div>
      <Label>{label}</Label>
      <input name={name} type={type} required={required} defaultValue={defaultValue} className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm" />
    </div>
  );
}
