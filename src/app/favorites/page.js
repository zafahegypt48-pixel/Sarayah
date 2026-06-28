"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ListingCard from "@/components/ListingCard";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useI18n } from "@/lib/i18n/client";

const COLS =
  "id,name,slug,type,category_id,city,area,images,rating,reviews,price_min,startingPrice,verification_status";

export default function FavoritesPage() {
  const { t } = useI18n();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [state, setState] = useState("loading"); // loading | anon | ready
  const [listings, setListings] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { setState("anon"); return; }
      // RLS returns only this user's favorites; the embed returns only approved listings.
      const { data } = await supabase
        .from("favorites")
        .select(`listing_id, created_at, venues(${COLS})`)
        .order("created_at", { ascending: false });
      if (!active) return;
      setListings((data || []).map((r) => r.venues).filter(Boolean));
      setState("ready");
    })();
    return () => { active = false; };
  }, [supabase]);

  if (state === "loading") return <div className="max-w-6xl mx-auto px-5 py-16 text-cream/50">…</div>;

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <h1 className="font-display text-3xl text-cream mb-8">{t.fav.title}</h1>
      {state === "anon" ? (
        <div className="text-center py-16">
          <p className="text-cream/60 mb-5">{t.fav.loginPrompt}</p>
          <Link href="/login?next=/favorites" className="inline-block bg-emerald text-onnight font-semibold px-6 py-3 rounded-full hover:opacity-90 transition">{t.nav.login}</Link>
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-cream/50 mb-5">{t.fav.empty}</p>
          <Link href="/venues" className="inline-block bg-emerald text-onnight font-semibold px-6 py-3 rounded-full hover:opacity-90 transition">{t.fav.browse}</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      )}
    </div>
  );
}
