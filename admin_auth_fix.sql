-- ============================================================================
-- SARAYAH — ADMIN AUTHORIZATION HARDENING
-- ============================================================================
-- Makes public.admins the SINGLE SOURCE OF TRUTH for admin access. The app now
-- verifies admin status by calling is_admin() over PostgREST (with the caller's
-- JWT) instead of trusting the ADMIN_EMAILS env var. This grant guarantees the
-- function is callable as an RPC by any authenticated session so:
--   • a user whose email IS in public.admins  -> is_admin() = true  -> allowed
--   • a normal authenticated user (not listed) -> is_admin() = false -> 403
-- is_admin() is SECURITY DEFINER and only reads the caller's own JWT email, so a
-- non-admin can call it but can only ever learn that they themselves are false.
-- Idempotent + additive. Does NOT modify any rows in public.admins.
-- ============================================================================

-- Callable by logged-in users (returns the truth about THEIR OWN email only).
grant execute on function public.is_admin() to authenticated;

-- (Anon keeps execute too: several public SELECT RLS policies reference
-- is_admin() in an OR branch, and revoking it from anon would break those
-- evaluations for logged-out visitors. is_admin() is false for anon anyway,
-- since there is no JWT email.)
grant execute on function public.is_admin() to anon;

-- Reload PostgREST's schema cache so the RPC is exposed immediately.
notify pgrst, 'reload schema';
