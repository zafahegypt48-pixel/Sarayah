// The Sarayah wordmark — bold geometric sans + terracotta dot, matching the brand
// logo. Rendered as text (via the Poppins --font-wordmark) so it stays crisp at
// any size and re-colors for light (navbar) vs dark (footer) backgrounds.
// It's a logo, not copy, so the name is intentionally NOT translated.
//
// `shimmer` adds Sarayah's signature slow gold sheen (see .wordmark-shimmer in
// globals.css) — used on the navbar so it greets every visitor. The dot keeps
// its own color (kept OUTSIDE the shimmer span so background-clip doesn't hide it).
export default function Wordmark({ className = "", dotClassName = "text-[#bf7a52]", shimmer = false }) {
  return (
    <span
      style={{ fontFamily: "var(--font-wordmark)" }}
      className={`inline-block font-bold tracking-tight leading-none ${className}`}
    >
      <span className={shimmer ? "wordmark-shimmer" : ""}>Sarayah</span>
      <span className={dotClassName}>.</span>
    </span>
  );
}
