// Client-side upload limits + image optimisation. Browser-only (uses canvas /
// createImageBitmap); call from client components. These limits are mirrored by
// the AUTHORITATIVE server-side enforcement in Supabase Storage bucket config
// (file_size_limit + allowed_mime_types) — see storage_limits.sql — and by the
// per-request count caps in /api/venues. The frontend checks here exist only to
// give a fast, clear error before bytes leave the browser.

const MB = 1024 * 1024;
export const MAX_IMAGE_BYTES = 10 * MB; // venue photos
export const MAX_DOC_BYTES = 20 * MB;   // verification / claim documents
export const MAX_IMAGES = 12;
export const MAX_DOCS = 6;

export const formatMB = (bytes) => `${(bytes / MB).toFixed(0)} MB`;

// The image types the venue-images / venue-docs buckets accept. A file whose
// type is NOT here must be converted to WebP client-side (or rejected) — the
// bucket would otherwise reject it server-side.
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const isAllowedImageType = (type) => ALLOWED_IMAGE_TYPES.includes(type);

// Document (verification/proof) types the venue-docs bucket accepts.
export const ALLOWED_DOC_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const isAllowedDocType = (type) => ALLOWED_DOC_TYPES.includes(type);

// crypto.randomUUID() only exists in secure contexts (https) and modern engines.
// Fall back to a collision-resistant-enough id so uploads never throw on older
// mobile browsers or plain-http dev.
export function safeUUID() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch { /* fall through */ }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
}

// Downscale + re-encode a large photo to fit under `maxBytes` WITHOUT visible
// quality loss. Photos already within the dimension cap AND the byte budget are
// returned untouched, so normal-sized uploads keep their exact original bytes.
// Animated GIFs are never re-encoded (would drop animation). Pass
// `reencodeAlways` to force a WebP conversion even when the file is small — used
// for decodable-but-unsupported formats (HEIC/BMP/…) so the bucket accepts them.
export async function compressImageToFit(file, { maxBytes = MAX_IMAGE_BYTES, maxDimension = 2560, reencodeAlways = false } = {}) {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // can't decode → leave original; caller validates type/size
  }

  const biggest = Math.max(bitmap.width, bitmap.height);
  const withinDimension = biggest <= maxDimension;
  const withinBytes = file.size <= maxBytes;
  if (withinDimension && withinBytes && !reencodeAlways) {
    bitmap.close?.();
    return file; // already fine — preserve original quality exactly
  }

  const scale = Math.min(1, maxDimension / biggest);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const rename = (f) => f.name.replace(/\.[^.]+$/, "") + ".webp";
  // Step quality down only as far as needed to fit the byte budget — start high
  // (0.92) to preserve detail, and stop at the first size that fits.
  for (const q of [0.92, 0.85, 0.78, 0.7]) {
    const blob = await new Promise((res) => canvas.toBlob(res, "image/webp", q));
    if (blob && blob.size <= maxBytes) {
      return new File([blob], rename(file), { type: "image/webp" });
    }
  }
  // Couldn't get under the budget even at 0.7 — return the smallest attempt so
  // the caller's size check produces a clear "too large" error.
  const blob = await new Promise((res) => canvas.toBlob(res, "image/webp", 0.7));
  return blob ? new File([blob], rename(file), { type: "image/webp" }) : file;
}
