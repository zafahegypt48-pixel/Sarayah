import { getCategories, getAllListingSlugs } from "@/lib/data";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Dynamic sitemap: static pages + every category + every approved listing.
export default async function sitemap() {
  const staticPaths = [
    "", "/venues", "/search", "/concierge", "/favorites", "/how-it-works",
    "/about", "/contact", "/faq", "/terms", "/privacy", "/add-venue",
  ];
  const entries = staticPaths.map((p) => ({
    url: `${BASE}${p}`,
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.6,
  }));

  try {
    const cats = await getCategories();
    for (const c of cats) entries.push({ url: `${BASE}/c/${c.id}`, changeFrequency: "weekly", priority: 0.7 });
  } catch { /* ignore */ }

  try {
    const slugs = await getAllListingSlugs();
    for (const s of slugs) {
      if (!s.slug) continue;
      entries.push({
        url: `${BASE}/listing/${s.slug}`,
        lastModified: s.updated_at ? new Date(s.updated_at) : undefined,
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  } catch { /* ignore */ }

  return entries;
}
