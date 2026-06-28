"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useI18n } from "@/lib/i18n/client";
import { LOCALE_COOKIE } from "@/lib/i18n/dictionaries";

const HELP_LINKS = [
  ["/how-it-works", "howItWorks"],
  ["/faq", "faq"],
  ["/contact", "contact"],
  ["/terms", "terms"],
  ["/privacy", "privacy"],
];

// Module-level (outside the component) so the cookie writes aren't analysed as a
// component-body mutation by the react-hooks immutability rule.
function writeCookie(name, value) {
  if (typeof document !== "undefined") {
    document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
  }
}
function readTheme() {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export default function HeaderActions() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [open, setOpen] = useState(null); // null | "settings" | "support"
  const [user, setUser] = useState(null);
  const [theme, setThemeState] = useState("light");

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => { if (active) setUser(data?.user || null); });
    setThemeState(readTheme()); // eslint-disable-line react-hooks/set-state-in-effect
    return () => { active = false; };
  }, [supabase]);

  function setLocale(next) {
    writeCookie(LOCALE_COOKIE, next);
    setOpen(null);
    router.refresh();
  }
  function setTheme(next) {
    writeCookie("sarayah_theme", next);
    setThemeState(next);
    if (typeof document !== "undefined") document.documentElement.setAttribute("data-theme", next);
  }
  async function logout() {
    await supabase.auth.signOut();
    setOpen(null);
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <button type="button" aria-label={t.settings.aria} title={t.settings.aria}
        onClick={() => setOpen("settings")} className="p-2 text-cream/70 hover:text-cream transition">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
        </svg>
      </button>
      <button type="button" aria-label={t.support.aria} title={t.support.aria}
        onClick={() => setOpen("support")} className="relative p-2 text-cream/70 hover:text-cream transition">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z" />
        </svg>
        <span className="absolute -top-0.5 -end-0.5 text-[8px] font-bold bg-brass text-night rounded-full px-1 leading-tight">{t.support.aiBadge}</span>
      </button>

      {open === "settings" && (
        <Sheet title={t.settings.title} backLabel={t.settings.back} onClose={() => setOpen(null)}>
          <Section label={t.settings.language}>
            <div className="flex gap-2">
              {[["en", "English"], ["ar", "العربية"]].map(([code, name]) => (
                <button key={code} onClick={() => setLocale(code)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${locale === code ? "bg-emerald text-onnight border-emerald" : "border-hair text-cream/70 hover:border-emerald/50"}`}>
                  {name}
                </button>
              ))}
            </div>
          </Section>
          <Section label={t.settings.theme}>
            <div className="flex gap-2">
              {[["light", t.settings.light], ["dark", t.settings.dark]].map(([mode, name]) => (
                <button key={mode} onClick={() => setTheme(mode)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${theme === mode ? "bg-emerald text-onnight border-emerald" : "border-hair text-cream/70 hover:border-emerald/50"}`}>
                  {name}
                </button>
              ))}
            </div>
          </Section>
          <Section label={t.settings.account}>
            {user ? (
              <AccountPanel user={user} supabase={supabase} t={t} onLogout={logout} onClose={() => setOpen(null)} />
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Link href="/login" onClick={() => setOpen(null)} className="px-4 py-2 rounded-full text-sm font-semibold bg-surface border border-hair text-cream hover:border-emerald/50 transition">{t.settings.login}</Link>
                  <Link href="/signup" onClick={() => setOpen(null)} className="px-4 py-2 rounded-full text-sm font-semibold bg-emerald text-onnight transition">{t.settings.signup}</Link>
                </div>
                <p className="text-xs text-cream/40">{t.settings.privacyNote}</p>
              </div>
            )}
          </Section>
          <Section label={t.settings.help}>
            <div className="flex flex-col text-sm">
              {HELP_LINKS.map(([href, key]) => (
                <Link key={href} href={href} onClick={() => setOpen(null)} className="text-cream py-2 border-b border-hair last:border-0 hover:text-emerald transition flex items-center justify-between">
                  {t.footer[key]}
                  <span className="text-cream/30">›</span>
                </Link>
              ))}
            </div>
          </Section>
        </Sheet>
      )}

      {open === "support" && <SupportChat onClose={() => setOpen(null)} />}
    </>
  );
}

function Sheet({ title, backLabel, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-night/60 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-canvas border border-hair w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 mb-5">
          <button onClick={onClose} className="flex items-center gap-1.5 text-sm font-semibold text-cream/70 hover:text-cream transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 rtl:-scale-x-100"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            {backLabel}
          </button>
          <h2 className="font-display text-lg text-cream">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-cream/50 hover:text-cream text-xl">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div className="mb-6 last:mb-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-cream/40 mb-3">{label}</p>
      {children}
    </div>
  );
}

// Real, backend-connected account settings. Profile (name/phone) is stored in
// Supabase Auth user_metadata and the password via Auth — so it works WITHOUT the
// profiles table (deploy-safe even before the marketplace migration is applied).
function AccountPanel({ user, supabase, t, onLogout, onClose }) {
  const s = t.settings;
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
      <p className="text-xs text-cream/40">{s.privacyNote}</p>

      <div className="flex flex-wrap gap-2 pt-1">
        <Link href="/vendor/dashboard" onClick={onClose} className="px-4 py-2 rounded-full text-sm font-semibold bg-surface border border-hair text-cream hover:border-emerald/50 transition">{s.vendorDashboard}</Link>
        <button onClick={onLogout} className="px-4 py-2 rounded-full text-sm font-semibold bg-surface border border-hair text-cream hover:border-red-400/50 transition">{s.logout}</button>
      </div>
    </div>
  );
}

function SupportChat({ onClose }) {
  const { t } = useI18n();
  const ts = t.support;
  const [messages, setMessages] = useState([{ role: "assistant", content: ts.greeting, ui: true }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m) => !m.ui).map(({ role, content }) => ({ role, content })) }),
      });
      const data = await res.json().catch(() => ({}));
      const reply = data.fallback ? ts.fallback : data.reply || ts.error;
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: ts.error }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-night/60 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-canvas border border-hair w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl flex flex-col h-[80vh] sm:h-[600px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 p-4 border-b border-hair">
          <button onClick={onClose} aria-label="Back" className="text-cream/60 hover:text-cream shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 rtl:-scale-x-100"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-cream flex items-center gap-2">{ts.title}<span className="text-[9px] font-bold bg-brass text-night rounded-full px-1.5 py-0.5">{ts.aiBadge}</span></h2>
            <p className="text-xs text-cream/50 truncate">{ts.subtitle}</p>
          </div>
          <button onClick={onClose} className="text-cream/40 hover:text-cream text-xl shrink-0">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-emerald text-onnight" : "bg-surface border border-hair text-cream/90"}`}>
                {m.content}
              </div>
            </div>
          ))}
          {sending && <div className="flex justify-start"><div className="bg-surface border border-hair rounded-2xl px-4 py-2.5 text-sm text-cream/50">{ts.thinking}</div></div>}
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/faq" onClick={onClose} className="text-xs text-emerald hover:text-cream transition">{ts.faqLink}</Link>
            <Link href="/contact" onClick={onClose} className="text-xs text-emerald hover:text-cream transition">{ts.contactLink}</Link>
          </div>
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="p-3 border-t border-hair flex items-center gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={ts.placeholder}
            className="flex-1 bg-surface border border-hair rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/30" />
          <button disabled={sending || !input.trim()} className="bg-emerald text-onnight font-semibold text-sm px-5 py-2.5 rounded-full hover:opacity-90 transition disabled:opacity-40 shrink-0">
            {ts.send}
          </button>
        </form>
      </div>
    </div>
  );
}
