"use client";
// template.js re-mounts on every navigation (unlike layout.js), so wrapping the
// page in an entrance animation gives a smooth fade page-transition. Opacity-only
// so it composites cleanly with the per-element reveal/stagger animations, and it
// respects prefers-reduced-motion via the global CSS rule (see globals.css).
export default function Template({ children }) {
  return <div className="page-enter">{children}</div>;
}
