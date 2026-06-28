"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";

// Full-page Support assistant. Works with or without an AI provider key: the
// /api/support route falls back to a local rule-based assistant when no key is
// set, so this page is always functional.
export default function SupportPage() {
  const { t, locale } = useI18n();
  const ts = t.support;
  const router = useRouter();
  const [messages, setMessages] = useState([{ role: "assistant", content: ts.greeting, ui: true }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, sending]);

  async function ask(text) {
    const q = text.trim();
    if (!q || sending) return;
    const next = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          messages: next.filter((m) => !m.ui).map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      const reply = data.reply || ts.error;
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: ts.error }]);
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    ask(input);
  }

  // Go back to the previous page if there is history, else home.
  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-5 py-6">
      {/* Header with a clear back / exit arrow */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={goBack} aria-label={ts.back} title={ts.back}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-surface border border-hair text-cream hover:border-emerald/50 transition shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 rtl:-scale-x-100"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-2xl text-cream flex items-center gap-2">
            {ts.title}
            <span className="text-[9px] font-bold bg-brass text-night rounded-full px-1.5 py-0.5">{ts.aiBadge}</span>
          </h1>
          <p className="text-xs text-cream/50 truncate">{ts.subtitle}</p>
        </div>
      </div>

      <div className="bg-surface border border-hair rounded-2xl flex flex-col h-[68vh]">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-emerald text-onnight" : "bg-canvas border border-hair text-cream/90"}`}>
                {m.content}
              </div>
            </div>
          ))}
          {sending && <div className="flex justify-start"><div className="bg-canvas border border-hair rounded-2xl px-4 py-2.5 text-sm text-cream/50">{ts.thinking}</div></div>}

          {/* Suggestion chips (only before the first question) */}
          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {ts.suggestions.map((s) => (
                <button key={s} onClick={() => ask(s)}
                  className="text-xs text-cream/60 border border-hair rounded-full px-3 py-1.5 hover:border-emerald/40 hover:text-cream transition">
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/faq" className="text-xs text-emerald hover:text-cream transition">{ts.faqLink}</Link>
            <Link href="/contact" className="text-xs text-emerald hover:text-cream transition">{ts.contactLink}</Link>
          </div>
          <div ref={endRef} />
        </div>

        <form onSubmit={onSubmit} className="p-3 border-t border-hair flex items-center gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={ts.placeholder}
            className="flex-1 bg-canvas border border-hair rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/30" />
          <button disabled={sending || !input.trim()} className="bg-emerald text-onnight font-semibold text-sm px-5 py-2.5 rounded-full hover:opacity-90 transition disabled:opacity-40 shrink-0">
            {ts.send}
          </button>
        </form>
      </div>
    </div>
  );
}
