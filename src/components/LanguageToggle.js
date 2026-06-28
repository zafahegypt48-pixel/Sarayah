"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { LOCALE_COOKIE } from "@/lib/i18n/dictionaries";

// Flips the site between English and Arabic. Persists the choice in the
// `hafla_locale` cookie (1 year) then refreshes so the server re-renders the
// whole tree — including <html lang/dir> — in the new locale.
export default function LanguageToggle({ className = "" }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchLocale() {
    const next = locale === "ar" ? "en" : "ar";
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={switchLocale}
      disabled={pending}
      aria-label={t.langToggle.aria}
      className={`inline-flex items-center gap-1.5 text-sm font-semibold text-cream/70 hover:text-cream transition disabled:opacity-50 ${className}`}
    >
      <span aria-hidden="true">🌐</span>
      {t.langToggle.label}
    </button>
  );
}
