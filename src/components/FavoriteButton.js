"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useI18n } from "@/lib/i18n/client";

// Heart toggle. Favorites are secured by RLS (own-rows only), so this talks to
// Supabase directly from the browser — no API route needed. Not signed in → send
// the user to log in. Used on cards (overlay) and the detail page.
export default function FavoriteButton({ listingId, size = "md", className = "" }) {
  const { t } = useI18n();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState(null);
  const [fav, setFav] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      setUser(user || null);
      if (user) {
        const { data } = await supabase.from("favorites").select("id").eq("listing_id", listingId).maybeSingle();
        if (active) setFav(Boolean(data));
      }
    })();
    return () => { active = false; };
  }, [supabase, listingId]);

  async function toggle(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      const next = typeof window !== "undefined" ? window.location.pathname : "/";
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    setBusy(true);
    const prev = fav;
    setFav(!prev); // optimistic
    try {
      if (prev) {
        await supabase.from("favorites").delete().eq("listing_id", listingId).eq("user_id", user.id);
      } else {
        await supabase.from("favorites").insert({ user_id: user.id, listing_id: listingId });
      }
    } catch {
      setFav(prev); // revert on failure
    } finally {
      setBusy(false);
    }
  }

  const dim = size === "lg" ? "w-11 h-11 text-xl" : "w-9 h-9 text-base";
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={fav ? t.fav.remove : t.fav.add}
      title={fav ? t.fav.remove : t.fav.add}
      className={`inline-flex items-center justify-center rounded-full bg-canvas/90 backdrop-blur shadow-sm hover:bg-canvas hover:scale-110 active:scale-95 transition disabled:opacity-60 ${dim} ${fav ? "text-red-500" : "text-cream/50"} ${className}`}
    >
      {/* key forces a remount so the pop animation replays on each toggle to favorited */}
      <span key={fav ? "on" : "off"} className={fav ? "animate-pop" : ""}>{fav ? "♥" : "♡"}</span>
    </button>
  );
}
