// Server-side i18n helper for Server Components and Route Handlers.
// Reads the locale from the `hafla_locale` cookie (set by the LanguageToggle).
// In Next.js 16 `cookies()` is async, so this helper is async too.
import { cookies } from "next/headers";
import {
  LOCALE_COOKIE,
  normalizeLocale,
  dirFor,
  getDictionary,
  translateEnum,
} from "./dictionaries";

export async function getLocale() {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}

// Theme: light is the DEFAULT; dark is opt-in via the Settings toggle (cookie).
export async function getTheme() {
  const store = await cookies();
  return store.get("hafla_theme")?.value === "dark" ? "dark" : "light";
}

// Returns everything a server component needs to render in the active locale:
//   locale ("en" | "ar"), dir ("ltr" | "rtl"), t (the dictionary object),
//   and tv(category, value) to translate a stored data value (enum).
export async function getI18n() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return {
    locale,
    dir: dirFor(locale),
    t,
    tv: (category, value) => translateEnum(t, category, value),
  };
}
