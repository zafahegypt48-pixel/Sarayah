// The Sarayah wordmark — bold geometric sans + terracotta dot, matching the brand
// logo. Rendered as text (via the Poppins --font-wordmark) so it stays crisp at
// any size and re-colors for light (navbar) vs dark (footer) backgrounds.
// It's a logo, not copy, so the name is intentionally NOT translated.
//
// To use an exact exported asset instead, drop it at public/wordmark.svg and
// replace the <span> below with:
//   <img src="/wordmark.svg" alt="Sarayah" className={className} />
export default function Wordmark({ className = "", dotClassName = "text-[#bf7a52]" }) {
  return (
    <span
      style={{ fontFamily: "var(--font-wordmark)" }}
      className={`inline-block font-bold tracking-tight leading-none ${className}`}
    >
      Sarayah<span className={dotClassName}>.</span>
    </span>
  );
}
