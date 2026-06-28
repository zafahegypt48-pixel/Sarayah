"use client";
import Link from "next/link";
import CategoryIcon from "@/components/CategoryIcon";
import { useI18n } from "@/lib/i18n/client";
import { isCategoryActive } from "@/lib/categories";

// Premium category tiles with professional line icons (not emojis). Names come
// from the data (bilingual). Coming-soon categories get a "Soon" badge.
export default function CategoryGrid({ categories }) {
  const { t, locale } = useI18n();
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
      {categories.map((c) => {
        const active = isCategoryActive(c.id);
        return (
          <Link
            key={c.id}
            href={`/c/${c.id}`}
            className={`group relative flex flex-col items-center gap-3 bg-surface border border-hair rounded-2xl p-5 text-center transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-ink/5 ${active ? "hover:border-emerald/50" : "hover:border-brass/50"}`}
          >
            {!active && (
              <span className="absolute top-2 end-2 text-[9px] font-bold uppercase tracking-wide bg-brass/15 text-brass rounded-full px-1.5 py-0.5">
                {t.marketplace.soon}
              </span>
            )}
            <span className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors ${active ? "bg-emerald/8 text-emerald group-hover:bg-emerald group-hover:text-cream" : "bg-brass/10 text-brass/80"}`}>
              <CategoryIcon id={c.id} className="w-6 h-6" />
            </span>
            <span className={`font-semibold text-xs sm:text-sm leading-tight ${active ? "text-cream" : "text-cream/60"}`}>
              {locale === "ar" ? c.name_ar : c.name_en}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
