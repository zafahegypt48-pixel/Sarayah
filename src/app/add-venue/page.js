"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useI18n } from "@/lib/i18n/client";
import {
  compressImageToFit, isAllowedImageType, isAllowedDocType, safeUUID, formatMB,
  MAX_IMAGE_BYTES, MAX_DOC_BYTES, MAX_IMAGES, MAX_DOCS,
} from "@/lib/upload";

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80";

// Process at most this many images at once — bounds memory on low-end Android.
const PROCESS_CONCURRENCY = 3;

// Versioned draft key — bump the suffix if the field shape changes so old drafts
// are ignored rather than mis-restored.
const DRAFT_KEY = "sarayah_add_venue_draft_v1";
// Sensitive contact fields are NEVER written to localStorage.
const DRAFT_SKIP = new Set(["authorization", "owner_email", "owner_phone", "owner_whatsapp"]);

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
    const meaningful = ["name", "description", "city", "area", "price_min", "owner_name"];
    const hasContent = meaningful.some((k) => data[k] && String(data[k]).trim());
    if (hasContent) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch { /* quota / private mode — ignore, autosave is best-effort */ }
}
function clearDraft() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

// Snapshot the form's text/select/checkbox values. NEVER files, the legal
// authorization checkbox, or sensitive contact fields (email/phone/whatsapp).
function serializeForm(formEl) {
  const out = {};
  for (const el of formEl.elements) {
    if (!el.name || DRAFT_SKIP.has(el.name)) continue;
    if (el.type === "file" || el.type === "submit" || el.type === "button") continue;
    if (el.type === "checkbox") out[el.name] = el.checked;
    else if (el.multiple && el.tagName === "SELECT") out[el.name] = Array.from(el.selectedOptions).map((o) => o.value);
    else out[el.name] = el.value;
  }
  return out;
}

// Upload ONE already-processed image to the public venue-images bucket → public URL.
async function putImage(supabase, file) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${safeUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("venue-images")
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from("venue-images").getPublicUrl(path).data.publicUrl;
}

// Upload ONE verification document to the PRIVATE venue-docs bucket → object path.
async function putDoc(supabase, file) {
  const ext = (file.name.split(".").pop() || "dat").toLowerCase();
  const path = `proof/${safeUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("venue-docs")
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
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

  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState({});
  const [draftRestored, setDraftRestored] = useState(false);

  // Managed image state — [{ id, key, name, file, previewUrl, status, error, uploadedUrl }]
  const [images, setImages] = useState([]);
  const [imgBusy, setImgBusy] = useState(0);
  const [imgNote, setImgNote] = useState("");
  const imagesRef = useRef([]);
  // Bounded processing queue (memory safety on mobile).
  const queueRef = useRef([]);
  const activeRef = useRef(0);

  // Managed document state — [{ id, key, name, size, type, file, uploadedPath }]
  const [docs, setDocs] = useState([]);
  const [docNote, setDocNote] = useState("");
  const docsRef = useRef([]);

  const formRef = useRef(null);
  const saveTimer = useRef(null);
  useEffect(() => { imagesRef.current = images; }, [images]);
  useEffect(() => { docsRef.current = docs; }, [docs]);

  useEffect(() => {
    fetch("/api/categories").then((r) => (r.ok ? r.json() : [])).then(setCats).catch(() => {});
    fetch("/api/locations").then((r) => (r.ok ? r.json() : { governorates: [], cities: [] }))
      .then((d) => { setGovs(d.governorates || []); setCities(d.cities || []); }).catch(() => {});
  }, []);

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

  // Revoke all preview object URLs on unmount.
  useEffect(() => () => {
    imagesRef.current.forEach((x) => x.previewUrl && URL.revokeObjectURL(x.previewUrl));
  }, []);

  // Persist the draft when the tab is hidden/closed (covers the mobile camera
  // backgrounding the tab).
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
  const source = params.get("source") === "whatsapp" ? "whatsapp_outreach" : "public";
  const prospectId = params.get("prospect_id") || "";

  useEffect(() => {
    if (prospectId) {
      fetch("/api/outreach/register-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospect_id: prospectId }),
      }).catch(() => {});
    }
  }, [prospectId]);

  function scheduleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (formRef.current) writeDraft(serializeForm(formRef.current));
    }, 500);
  }

  // ---- Images ------------------------------------------------------------
  function pumpImageQueue() {
    while (activeRef.current < PROCESS_CONCURRENCY && queueRef.current.length > 0) {
      const item = queueRef.current.shift();
      activeRef.current += 1;
      processImage(item);
    }
  }

  async function processImage(item) {
    try {
      const allowed = isAllowedImageType(item.file.type);
      const optimized = await compressImageToFit(item.file, {
        maxBytes: MAX_IMAGE_BYTES,
        reencodeAlways: !allowed && item.file.type !== "image/gif",
      });
      let error = "";
      if (optimized.size > MAX_IMAGE_BYTES) error = ta.photosTooLarge.replace("{name}", item.name);
      else if (!isAllowedImageType(optimized.type)) error = ta.photosUnsupported.replace("{name}", item.name);

      // If we re-encoded, swap the preview to the smaller file and release the
      // original blob — but only if the item still exists (not removed mid-run).
      let newPreview = "";
      if (!error && optimized !== item.file && imagesRef.current.some((x) => x.id === item.id)) {
        newPreview = URL.createObjectURL(optimized);
        URL.revokeObjectURL(item.previewUrl);
      }
      setImages((prev) => prev.map((x) =>
        x.id === item.id
          ? { ...x, file: optimized, previewUrl: newPreview || x.previewUrl, status: error ? "error" : "ready", error }
          : x));
    } catch {
      setImages((prev) => prev.map((x) =>
        x.id === item.id ? { ...x, status: "error", error: ta.photosProcessFail.replace("{name}", item.name) } : x));
    } finally {
      activeRef.current = Math.max(0, activeRef.current - 1);
      setImgBusy((b) => Math.max(0, b - 1));
      pumpImageQueue();
    }
  }

  function onSelectImages(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
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
      if (seen.has(key)) continue;
      if (!file.type.startsWith("image/")) { notes.push(ta.photosUnsupported.replace("{name}", file.name)); continue; }
      seen.add(key);
      accepted.push({
        id: safeUUID(), key, name: file.name, file,
        previewUrl: URL.createObjectURL(file), status: "processing", error: "", uploadedUrl: "",
      });
    }
    const overflow = picked.filter((f) => f.type.startsWith("image/")).length - remaining;
    if (overflow > 0) notes.push(ta.photosLimitTrimmed.replace("{n}", String(remaining)).replace("{s}", remaining === 1 ? "" : "s"));
    setImgNote(notes.join(" "));
    if (accepted.length === 0) return;

    setImages((prev) => [...prev, ...accepted]);
    setImgBusy((b) => b + accepted.length);
    queueRef.current.push(...accepted);
    pumpImageQueue();
  }

  function removeImage(id) {
    const found = imagesRef.current.find((x) => x.id === id);
    if (found?.previewUrl) URL.revokeObjectURL(found.previewUrl);
    // Drop from the pending queue too, so a not-yet-started item doesn't process.
    queueRef.current = queueRef.current.filter((x) => x.id !== id);
    setImages((prev) => prev.filter((x) => x.id !== id));
    setImgNote("");
  }

  // ---- Documents ---------------------------------------------------------
  function onSelectDocs(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (picked.length === 0) return;

    const current = docsRef.current;
    const remaining = MAX_DOCS - current.length;
    if (remaining <= 0) { setDocNote(ta.docsLimitReached); return; }

    const seen = new Set(current.map((it) => it.key));
    const notes = [];
    const accepted = [];
    for (const file of picked) {
      if (accepted.length >= remaining) break;
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (seen.has(key)) continue;
      if (!isAllowedDocType(file.type)) { notes.push(ta.docUnsupported.replace("{name}", file.name)); continue; }
      if (file.size > MAX_DOC_BYTES) { notes.push(ta.docTooLarge.replace("{name}", file.name)); continue; }
      seen.add(key);
      accepted.push({ id: safeUUID(), key, name: file.name, size: file.size, type: file.type, file, uploadedPath: "" });
    }
    const overflow = picked.length - remaining;
    if (overflow > 0) notes.push(ta.docsLimitTrimmed.replace("{n}", String(remaining)).replace("{s}", remaining === 1 ? "" : "s"));
    setDocNote(notes.join(" "));
    if (accepted.length === 0) return;
    setDocs((prev) => [...prev, ...accepted]);
  }

  function removeDoc(id) {
    setDocs((prev) => prev.filter((x) => x.id !== id));
    setDocNote("");
  }

  function resetFormAndUploads() {
    imagesRef.current.forEach((x) => x.previewUrl && URL.revokeObjectURL(x.previewUrl));
    queueRef.current = [];
    activeRef.current = 0;
    setImages([]); setImgNote(""); setImgBusy(0);
    setDocs([]); setDocNote("");
    formRef.current?.reset();
  }

  function discardDraft() {
    clearDraft();
    setDraftRestored(false);
    setDraft({});
    setCategory("venues");
    setGovernorate("");
    resetFormAndUploads();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    const f = e.target;

    const priceMin = Number(f.price_min?.value || 0);
    const priceMax = Number(f.price_max?.value || 0);
    if (priceMin <= 0) { setStatus("error"); setErrorMsg(ta.errPrice); return; }
    if (isVenue) {
      const capMin = Number(f.capacityMin?.value || 0);
      const capMax = Number(f.capacityMax?.value || 0);
      if (capMax < capMin) { setStatus("error"); setErrorMsg(ta.errCapacity); return; }
    }
    if (!f.authorization.checked) { setStatus("error"); setErrorMsg(ta.errAuth); return; }

    if (imgBusy > 0) { setStatus("error"); setErrorMsg(ta.photosStillProcessing); return; }
    if (imagesRef.current.some((x) => x.status === "error")) { setStatus("error"); setErrorMsg(ta.photosFixErrors); return; }

    setStatus("sending");
    try {
      const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? createSupabaseBrowserClient() : null;

      // Photos — upload one by one; skip already-uploaded (retry-safe).
      let images = [PLACEHOLDER_IMAGE];
      const imgItems = imagesRef.current;
      if (imgItems.length > 0 && supabase) {
        const urls = [];
        const failed = [];
        for (const item of imgItems) {
          if (item.uploadedUrl) { urls.push(item.uploadedUrl); continue; }
          try {
            const url = await putImage(supabase, item.file);
            urls.push(url);
            setImages((prev) => prev.map((x) => (x.id === item.id ? { ...x, uploadedUrl: url } : x)));
          } catch { failed.push(item.name); }
        }
        if (failed.length > 0) throw new Error(ta.photosUploadFailed.replace("{n}", String(failed.length)).replace("{s}", failed.length === 1 ? "" : "s"));
        images = urls.length > 0 ? urls : [PLACEHOLDER_IMAGE];
      }

      // Verification documents — upload one by one; skip already-uploaded.
      const verification_docs = [];
      const docItems = docsRef.current;
      if (docItems.length > 0 && supabase) {
        const failedDocs = [];
        for (const d of docItems) {
          if (d.uploadedPath) { verification_docs.push(d.uploadedPath); continue; }
          try {
            const p = await putDoc(supabase, d.file);
            verification_docs.push(p);
            setDocs((prev) => prev.map((x) => (x.id === d.id ? { ...x, uploadedPath: p } : x)));
          } catch { failedDocs.push(d.name); }
        }
        if (failedDocs.length > 0) throw new Error(ta.docsUploadFailed.replace("{n}", String(failedDocs.length)).replace("{s}", failedDocs.length === 1 ? "" : "s"));
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
        owner_name: f.owner_name.value,
        owner_role: f.owner_role.value,
        owner_email: f.owner_email.value,
        owner_phone: f.owner_phone.value,
        owner_whatsapp: f.owner_whatsapp.value,
        official_website: f.official_website.value,
        google_maps_link: f.google_maps_link.value,
        social_link: f.social_link.value,
        authorization_confirmed: true,
        verification_docs,
        source,
        prospect_id: prospectId || undefined,
      };
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
        payload.startingPrice = priceMin;
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
      clearDraft();
      resetFormAndUploads();
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || ta.errGeneric);
    }
  }

  if (status === "sent") {
    return (
      <div className="max-w-xl mx-auto px-5 py-24 text-center">
        <h1 className="font-display text-3xl text-emerald mb-3">{ta.sentTitle}</h1>
        <p className="text-cream/60">{ta.sentBody}</p>
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

        <div>
          <Label>{ta.category}</Label>
          <select name="category_id" value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface">
            {cats.map((c) => <option key={c.id} value={c.id}>{locale === "ar" ? c.name_ar : c.name_en}</option>)}
          </select>
        </div>

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={ta.startingPrice} name="price_min" type="number" required defaultValue={draft.price_min} />
          <Field label={ta.priceMax} name="price_max" type="number" defaultValue={draft.price_max} />
        </div>

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
            <Field label={ta.ownerEmail} name="owner_email" type="email" />
            <Field label={ta.ownerPhone} name="owner_phone" type="tel" />
            <Field label={ta.ownerWhatsapp} name="owner_whatsapp" type="tel" />
            <Field label={ta.officialWebsite} name="official_website" defaultValue={draft.official_website} />
            <Field label={ta.googleMaps} name="google_maps_link" defaultValue={draft.google_maps_link} />
          </div>
          <div className="mt-4">
            <Field label={ta.socialLink} name="social_link" defaultValue={draft.social_link} />
          </div>

          {/* Verification documents — managed uploader (no image preview for PDFs) */}
          <div className="mt-4">
            <Label>{ta.proof}</Label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              onChange={onSelectDocs}
              disabled={docs.length >= MAX_DOCS}
              className="w-full border border-hair rounded-lg px-3 py-2.5 text-sm bg-surface file:me-3 file:rounded-full file:border-0 file:bg-night file:text-cream file:px-3 file:py-1.5 file:text-xs file:font-semibold disabled:opacity-50"
            />
            <div className="flex items-center justify-between gap-2 mt-1">
              <p className="text-xs text-cream/40">{ta.proofHint}</p>
              {docs.length > 0 && (
                <span className="text-xs text-cream/50 shrink-0">{ta.docsCount.replace("{n}", String(docs.length))}</span>
              )}
            </div>
            {docNote && <p className="text-xs text-red-600 mt-2">{docNote}</p>}
            {docs.length > 0 && (
              <ul className="mt-3 space-y-2">
                {docs.map((d) => {
                  const isPdf = d.type === "application/pdf";
                  return (
                    <li key={d.id} className="flex items-center gap-3 border border-hair rounded-lg px-3 py-2 text-sm">
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded ${isPdf ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                        {isPdf ? "PDF" : "IMG"}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-cream/80">{d.name}</span>
                      <span className="shrink-0 text-xs text-cream/45">{formatMB(d.size)}</span>
                      <button type="button" onClick={() => removeDoc(d.id)} aria-label={ta.removeDoc}
                        className="shrink-0 text-cream/40 hover:text-red-600 transition text-sm font-bold">✕</button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <p className="text-xs text-cream/50 bg-night/5 rounded-lg p-3">{ta.moderationNote}</p>

        <label className="flex items-start gap-2.5 text-sm text-cream/70">
          <input type="checkbox" name="authorization" required className="accent-emerald mt-0.5" />
          <span>{ta.authConfirm} <span className="text-red-500">*</span></span>
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
