// Builds the current notification list from real app state. The TEXT is localized
// by the dictionary, but WHICH items appear (and their read/unread state) is
// dynamic — e.g. the "sign in" nudge only shows when logged out. This is the
// single place to wire a real notifications backend later: replace the body of
// buildNotifications with a fetch and keep the same shape.
export function buildNotifications(t, { signedIn } = {}) {
  const n = (t?.notifications?.items) || {};
  const list = [{ id: "welcome", href: "/venues", ...n.welcome }];
  if (!signedIn) list.push({ id: "signin", href: "/login", ...n.signin });
  list.push({ id: "planner", href: "/concierge", ...n.planner });
  list.push({ id: "favorites", href: "/settings", ...n.favorites });
  return list.filter((i) => i.title); // drop any item missing a translation
}

const READ_KEY = "sarayah_notif_read";

export function getReadIds() {
  if (typeof localStorage === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

export function saveReadIds(set) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore quota / private-mode errors */
  }
}
