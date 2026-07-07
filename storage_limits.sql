-- ============================================================================
-- SARAYAH — STORAGE UPLOAD LIMITS
-- ============================================================================
-- Raises the AUTHORITATIVE server-side upload limits enforced by Supabase
-- Storage. Files upload directly from the browser to Storage, so these bucket
-- settings — not any API route — are what actually cap size + MIME type.
--   • venue-images (public):  10 MB per image, raster images only (no SVG).
--   • venue-docs   (private): 20 MB per file, images + PDF only.
-- Idempotent: safe to run repeatedly; changes only the two bucket rows.
-- ============================================================================

update storage.buckets
  set file_size_limit    = 10485760,  -- 10 MB
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
  where id = 'venue-images';

update storage.buckets
  set file_size_limit    = 20971520,  -- 20 MB
      allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf']
  where id = 'venue-docs';

-- Verify:
-- select id, file_size_limit, allowed_mime_types from storage.buckets
-- where id in ('venue-images','venue-docs');
