import Link from "next/link";
import { notFound } from "next/navigation";
import CategoryBrowser from "@/components/CategoryBrowser";
import CategoryIcon from "@/components/CategoryIcon";
import { getCategory, getGovernorates, isCategoryActive } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

// SEO: per-category title/description (English default; fine for search engines).
export async function generateMetadata({ params }) {
  const { category } = await params;
  const cat = await getCategory(category);
  if (!cat) return { title: "Category" };
  return {
    title: `${cat.name_en} in Egypt`,
    description: `Browse and compare ${cat.name_en.toLowerCase()} for weddings and events across Egypt on Sarayah — filter by area and price, then send one inquiry.`,
    alternates: { canonical: `/c/${cat.id}` },
  };
}

export default async function CategoryPage({ params, searchParams }) {
  const { category } = await params;
  const sp = (await searchParams) || {};
  const cat = await getCategory(category);
  if (!cat) return notFound();

  const [governorates, { t, locale }] = await Promise.all([getGovernorates(), getI18n()]);
  const name = locale === "ar" ? cat.name_ar : cat.name_en;
  const active = isCategoryActive(cat.id);
  const initialGov = typeof sp.gov === "string" ? sp.gov : "";

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <div className="mb-8">
        <Link href="/" className="text-sm font-semibold text-emerald hover:text-cream transition">
          {t.marketplace.allCategories}
        </Link>
        <h1 className="font-display text-3xl text-cream mt-2 flex items-center gap-3">
          <span className="flex items-center justify-center w-11 h-11 rounded-full bg-emerald/8 text-emerald shrink-0">
            <CategoryIcon id={cat.id} className="w-6 h-6" />
          </span>
          {name}
        </h1>
      </div>

      {active ? (
        <CategoryBrowser category={cat.id} categoryObj={cat} governorates={governorates} initialGovernorate={initialGov} />
      ) : (
        <div className="bg-surface border border-hair rounded-2xl py-20 px-6 text-center">
          <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brass/15 text-brass mb-5">
            <CategoryIcon id={cat.id} className="w-8 h-8" />
          </span>
          <h2 className="font-display text-2xl text-cream mb-2">{t.marketplace.comingSoon}</h2>
          <p className="text-cream/60 max-w-md mx-auto">{t.marketplace.comingSoonBody.replace("{category}", name)}</p>
          <Link href="/" className="inline-block mt-6 bg-emerald text-onnight font-semibold px-6 py-3 rounded-full hover:opacity-90 transition">
            {t.marketplace.allCategories}
          </Link>
        </div>
      )}
    </div>
  );
}
