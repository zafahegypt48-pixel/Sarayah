// Professional line icons per category (replaces the emojis). Consistent stroke,
// monochrome, scalable — they inherit `currentColor` so they recolor on hover.
const ICONS = {
  venues: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V9l7-5 7 5v12" />
      <path d="M10 21v-5h4v5" />
    </>
  ),
  photography: (
    <>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h8l2 3h3a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  videography: (
    <>
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="M22 8l-6 4 6 4z" />
    </>
  ),
  "makeup-hair": <path d="M12 2l2.2 6.3L21 10l-6.8 1.7L12 18l-2.2-6.3L3 10l6.8-1.7z" />,
  catering: (
    <>
      <path d="M6 3v8M9 3v8M7.5 11v10M6 7h3" />
      <path d="M17.5 3c-1.6 1.4-2.5 3.6-2.5 6 0 1.6 1.1 2 2.5 2v10" />
    </>
  ),
  entertainment: (
    <>
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </>
  ),
  "wedding-dresses": <path d="M9.5 3h5l-1 3 3.5 4.5-2 1.8L19 21H5l1.5-7.7-2-1.8L8 6.5z" />,
  "flowers-decor": (
    <>
      <circle cx="12" cy="8" r="2.5" />
      <path d="M12 10.5V21M8 21h8" />
      <path d="M12 8c0-3 2-4.5 4.5-4.5M12 8c0-3-2-4.5-4.5-4.5" />
    </>
  ),
  "cakes-sweets": (
    <>
      <path d="M4 21h16v-7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3z" />
      <path d="M4 16h16M12 8V5M9 8V6.5M15 8V6.5" />
    </>
  ),
  invitations: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  "wedding-cars": (
    <>
      <path d="M5 16l1.6-5.2A2 2 0 0 1 8.5 9.4h7a2 2 0 0 1 1.9 1.4L19 16" />
      <path d="M3 16h18v3h-2v-1.5H5V19H3z" />
      <circle cx="7.5" cy="18.5" r="1.4" />
      <circle cx="16.5" cy="18.5" r="1.4" />
    </>
  ),
  planners: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </>
  ),
};

export default function CategoryIcon({ id, className = "w-6 h-6" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICONS[id] || <circle cx="12" cy="12" r="9" />}
    </svg>
  );
}
