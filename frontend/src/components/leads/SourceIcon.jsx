// Tiny inline brand marks for lead sources that come in via webhook
// intake. lucide-react v1 dropped Facebook/Instagram icons, so we draw
// them ourselves — kept minimal (16px f-mark and gradient-camera) so they
// read at a glance in dense table rows without dragging in a 3rd icon set.
//
// Returns null for sources we don't have a brand for (Walk-in, Referral,
// CSV import, etc.) — the source column falls back to plain text.

function FacebookMark({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-label="Facebook"
      role="img"
      style={{ flex: "0 0 auto" }}
    >
      <path
        fill="#1877F2"
        d="M24 12a12 12 0 1 0-13.875 11.854V15.469H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.875V12h3.328l-.532 3.469h-2.796v8.385A12.003 12.003 0 0 0 24 12Z"
      />
    </svg>
  )
}

function InstagramMark({ size = 14 }) {
  const gradId = "lp-ig-grad"
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-label="Instagram"
      role="img"
      style={{ flex: "0 0 auto" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FEDA75" />
          <stop offset="35%" stopColor="#FA7E1E" />
          <stop offset="65%" stopColor="#D62976" />
          <stop offset="100%" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill={`url(#${gradId})`} />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="17.3" cy="6.7" r="1.1" fill="#fff" />
    </svg>
  )
}

export default function SourceIcon({ source, size = 14 }) {
  if (!source) return null
  const norm = String(source).toLowerCase()
  if (norm === "facebook") return <FacebookMark size={size} />
  if (norm === "instagram") return <InstagramMark size={size} />
  return null
}
