// Which marketplace categories are LIVE vs "coming soon". Standalone (no imports)
// so it's safe to use from both server and client components. Add a category id
// here to launch it.
export const ACTIVE_CATEGORIES = new Set(["venues", "invitations", "catering", "planners"]);

export function isCategoryActive(id) {
  return ACTIVE_CATEGORIES.has(id);
}
