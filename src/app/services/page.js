import CategoryGrid from "@/components/CategoryGrid";
import { getCategories } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

// Services landing — the full category grid (live + coming-soon), reachable from
// the bottom navigation. Reuses the same data + CategoryGrid as the home page.
export default async function ServicesPage() {
  const [categories, { t }] = await Promise.all([getCategories(), getI18n()]);

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <p className="text-brass-deep text-sm font-semibold uppercase tracking-wide mb-2">{t.services.eyebrow}</p>
      <h1 className="font-display text-3xl text-cream">{t.services.title}</h1>
      <p className="text-cream/60 mt-2 mb-8 max-w-xl">{t.services.subtitle}</p>
      <CategoryGrid categories={categories} />
    </div>
  );
}
