"use client";
// Client-side i18n. The root layout (a server component) reads the locale cookie
// and passes { locale, dict } into <LanguageProvider>; any client component below
// it then calls useI18n() to get the same { locale, dir, t, tv } shape that
// server components get from getI18n(). Keeping both in sync via the cookie means
// no flash of the wrong language.
import { createContext, useContext, useMemo } from "react";
import { dirFor, translateEnum } from "./dictionaries";

const I18nContext = createContext(null);

export function LanguageProvider({ locale, dict, children }) {
  const value = useMemo(
    () => ({
      locale,
      dir: dirFor(locale),
      t: dict,
      tv: (category, val) => translateEnum(dict, category, val),
    }),
    [locale, dict]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within <LanguageProvider>");
  }
  return ctx;
}
