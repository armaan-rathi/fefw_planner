// A stylized "tactician's map" backdrop used when no real map screenshot has
// been uploaded yet. Fills the stage; nodes/paths render on top of it.
export function MapBackdrop() {
  return (
    <svg className="map-backdrop" viewBox="0 0 160 90" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="mb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#102a31" />
          <stop offset="1" stopColor="#0a1a1f" />
        </linearGradient>
        <radialGradient id="mb-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(95,168,232,0.25)" />
          <stop offset="1" stopColor="rgba(95,168,232,0)" />
        </radialGradient>
      </defs>

      <rect width="160" height="90" fill="url(#mb-sky)" />

      {/* landmasses */}
      <path d="M0 8 C 30 2 55 16 80 10 C 110 3 140 14 160 8 L160 40 C 130 46 95 38 70 44 C 40 51 18 40 0 46 Z" fill="#15333b" opacity="0.9" />
      <path d="M0 52 C 28 46 60 58 92 52 C 120 47 145 56 160 50 L160 90 L0 90 Z" fill="#143840" opacity="0.85" />

      {/* forest patches */}
      <ellipse cx="26" cy="20" rx="18" ry="9" fill="#1b3a2c" opacity="0.55" />
      <ellipse cx="120" cy="24" rx="22" ry="10" fill="#1b3a2c" opacity="0.5" />
      <ellipse cx="38" cy="70" rx="20" ry="10" fill="#1b3a2c" opacity="0.5" />
      <ellipse cx="128" cy="72" rx="18" ry="9" fill="#1b3a2c" opacity="0.5" />

      {/* river running through the central hub */}
      <path
        d="M76 -2 C 72 12 84 22 80 34 C 76 46 84 56 80 70 C 78 80 82 86 80 92"
        fill="none"
        stroke="#2f6f86"
        strokeWidth="3.4"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M76 -2 C 72 12 84 22 80 34 C 76 46 84 56 80 70 C 78 80 82 86 80 92"
        fill="none"
        stroke="#4f97b8"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.7"
      />

      {/* faint contour rings */}
      {[
        [120, 24, 14],
        [26, 70, 12],
        [128, 70, 10],
      ].map(([cx, cy, r], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={r} ry={r * 0.55} fill="none" stroke="rgba(216,182,106,0.10)" strokeWidth="0.5" />
      ))}

      <rect width="160" height="90" fill="url(#mb-glow)" opacity="0.5" />
    </svg>
  );
}
