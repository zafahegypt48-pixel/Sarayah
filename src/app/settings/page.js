"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useI18n } from "@/lib/i18n/client";
import { LOCALE_COOKIE } from "@/lib/i18n/dictionaries";

function writeCookie(name, value) {
  if (typeof document !== "undefined") {
    document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
  }
}
function readTheme() {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

const NOTIF_KEY = "sarayah_notif_prefs";

export default function SettingsPage() {
  const { t, locale } = useI18n();
  const s = t.settings;
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [theme, setThemeState] = useState("light");

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data?.user || null);
      setReady(true);
    });
    setThemeState(readTheme()); // eslint-disable-line react-hooks/set-state-in-effect
    return () => { active = false; };
  }, [supabase]);

  function setLocale(next) {
    writeCookie(LOCALE_COOKIE, next);
    router.refresh();
  }
  function setTheme(next) {
    writeCookie("sarayah_theme", next);
    setThemeState(next);
    if (typeof document !== "undefined") document.documentElement.setAttribute("data-theme", next);
  }
  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <h1 className="font-display text-3xl text-cream mb-8">{s.title}</h1>

      {/* Account */}
      <Section label={s.account}>
        {!ready ? (
          <p className="text-cream/40 text-sm">…</p>
        ) : user ? (
          <AccountPanel user={user} supabase={supabase} s={s} onLogout={logout} />
        ) : (
          <div className="space-y-3">
            <p className="text-cream/60 text-sm">{s.loginToManage}</p>
            <div className="flex gap-2">
              <Link href="/login" className="px-4 py-2 rounded-full text-sm font-semibold bg-surface border border-hair text-cream hover:border-emerald/50 transition">{s.login}</Link>
              <Link href="/signup" className="px-4 py-2 rounded-full text-sm font-semibold bg-emerald text-onnight transition">{s.signup}</Link>
            </div>
          </div>
        )}
      </Section>

      {/* Favorites */}
      <Section label={s.favorites}>
        <p className="text-cream/60 text-sm mb-3">{s.favoritesDesc}</p>
        <Link href="/favorites" className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-surface border border-hair text-cream hover:border-emerald/50 transition">
          <span className="text-red-500">♥</span> {s.viewFavorites}
        </Link>
      </Section>

      {/* Notification preferences */}
      <Section label={s.notifications}>
        <NotificationPrefs s={s} />
      </Section>

      {/* Theme */}
      <Section label={s.theme}>
        <div className="flex gap-2">
          {[["light", s.light], ["dark", s.dark]].map(([mode, name]) => (
            <button key={mode} onClick={() => setTheme(mode)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${theme === mode ? "bg-emerald text-onnight border-emerald" : "border-hair text-cream/70 hover:border-emerald/50"}`}>
              {name}
            </button>
          ))}
        </div>
      </Section>

      {/* Language */}
      <Section label={s.language}>
        <div className="flex gap-2">
          {[["en", "English"], ["ar", "العربية"]].map(([code, name]) => (
            <button key={code} onClick={() => setLocale(code)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition active:scale-[0.97] ${locale === code ? "bg-emerald text-onnight border-emerald" : "border-hair text-cream/70 hover:border-emerald/50"}`}>
              {name}
            </button>
          ))}
        </div>
      </Section>

      {/* Help & support */}
      <Section label={s.help}>
        <div className="flex flex-col text-sm">
          {[
            ["/support", t.nav.support],
            ["/contact", t.footer.contact],
            ["/add-venue", t.nav.listVenue],
            ["/faq", t.footer.faq],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="text-cream py-2.5 border-b border-hair last:border-0 hover:text-emerald transition flex items-center justify-between">
              {label}
              <span className="text-cream/30 rtl:-scale-x-100">›</span>
            </Link>
          ))}
        </div>
      </Section>

      <p className="text-xs text-cream/40 mt-4">{s.privacyNote}</p>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div className="mb-8 pb-8 border-b border-hair last:border-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-cream/40 mb-3">{label}</p>
      {children}
    </div>
  );
}

// Notification preferences — stored locally (no backend needed yet). Placeholder
// that becomes real once a notifications backend exists.
function NotificationPrefs({ s }) {
  const [prefs, setPrefs] = useState({ inquiries: true, promotions: false });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof localStorage !== "undefined" && localStorage.getItem(NOTIF_KEY);
      if (raw) setPrefs((p) => ({ ...p, ...JSON.parse(raw) })); // eslint-disable-line react-hooks/set-state-in-effect
    } catch { /* ignore */ }
  }, []);

  function toggle(key) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try { localStorage.setItem(NOTIF_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    setSaved(true);
  }

  const rows = [
    ["inquiries", s.notifInquiries, s.notifInquiriesDesc],
    ["promotions", s.notifPromotions, s.notifPromotionsDesc],
  ];

  return (
    <div className="space-y-3">
      {rows.map(([key, label, desc]) => (
        <label key={key} className="flex items-start justify-between gap-3 cursor-pointer">
          <span>
            <span className="text-sm text-cream block">{label}</span>
            <span className="text-xs text-cream/50">{desc}</span>
          </span>
          <button type="button" role="switch" aria-checked={prefs[key]} onClick={() => toggle(key)}
            className={`relative w-11 h-6 rounded-full transition shrink-0 ${prefs[key] ? "bg-emerald" : "bg-hair"}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-canvas transition-all ${prefs[key] ? "start-[22px]" : "start-0.5"}`} />
          </button>
        </label>
      ))}
      {saved && <p className="text-xs text-emerald">{s.notifSaved}</p>}
    </div>
  );
}

// Account profile (name/phone in Auth user_metadata) + password change. Works
// without the profiles table — deploy-safe before the marketplace migration.
function AccountPanel({ user, supabase, s, onLogout }) {
  const [name, setName] = useState(user.user_metadata?.full_name || "");
  const [phone, setPhone] = useState(user.user_metadata?.phone || "");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function saveProfile() {
    setBusy(true); setMsg("");
    const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim(), phone: phone.trim() } });
    setBusy(false); setMsg(error ? s.saveError : s.saved);
  }
  async function changePassword() {
    if (pw.length < 8) { setMsg(s.pwShort); return; }
    setBusy(true); setMsg("");
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) setMsg(error.message); else { setPw(""); setMsg(s.pwChanged); }
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-cream/50">{s.signedInAs} <span className="text-cream">{user.email}</span></p>
      <div>
        <label className="text-xs text-cream/50 block mb-1">{s.name}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-surface border border-hair rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-xs text-cream/50 block mb-1">{s.phone}</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-surface border border-hair rounded-lg px-3 py-2 text-sm" />
      </div>
      <button onClick={saveProfile} disabled={busy} className="bg-emerald text-onnight font-semibold px-4 py-2 rounded-full text-sm hover:opacity-90 disabled:opacity-50">
        {busy ? s.saving : s.save}
      </button>

      <div className="pt-3 border-t border-hair">
        <label className="text-xs text-cream/50 block mb-1">{s.changePassword}</label>
        <div className="flex gap-2">
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={s.newPassword}
            className="flex-1 bg-surface border border-hair rounded-lg px-3 py-2 text-sm" />
          <button onClick={changePassword} disabled={busy} className="bg-surface border border-hair text-cream font-semibold px-4 py-2 rounded-full text-sm hover:border-emerald/50 disabled:opacity-50 shrink-0">
            {s.update}
          </button>
        </div>
      </div>

      {msg && <p className="text-xs text-emerald">{msg}</p>}

      <div className="flex flex-wrap gap-2 pt-1">
        <Link href="/vendor/dashboard" className="px-4 py-2 rounded-full text-sm font-semibold bg-surface border border-hair text-cream hover:border-emerald/50 transition">{s.vendorDashboard}</Link>
        <button onClick={onLogout} className="px-4 py-2 rounded-full text-sm font-semibold bg-surface border border-hair text-cream hover:border-red-400/50 transition">{s.logout}</button>
      </div>
    </div>
  );
}
