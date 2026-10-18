// An ink-outlined house whose walls fill with cobalt, then a tangerine feature wall,
// from the ground up as it scrolls into view: the before/after told in one picture.
// Scroll-driven where supported, a one-shot pour elsewhere (see .house in globals.css).
export function HouseFill({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 360"
      className={`house block h-auto w-full ${className}`}
      role="img"
      aria-labelledby="house-fill-title"
    >
      <title id="house-fill-title">A house being painted cobalt blue, with a tangerine feature wall</title>
      <defs>
        <clipPath id="house-wall-main"><rect x="60" y="150" width="240" height="170" /></clipPath>
        <clipPath id="house-wall-side"><rect x="300" y="190" width="120" height="130" /></clipPath>
      </defs>
      {/* ground line */}
      <rect x="20" y="320" width="440" height="3" className="fill-ink" />
      {/* unpainted walls */}
      <rect x="60" y="150" width="240" height="170" className="fill-paper" />
      <rect x="300" y="190" width="120" height="130" className="fill-paper" />
      {/* paint rising */}
      <g clipPath="url(#house-wall-main)">
        <rect x="60" y="150" width="240" height="170" className="fill-level fill-cobalt" />
      </g>
      <g clipPath="url(#house-wall-side)">
        <rect x="300" y="190" width="120" height="130" className="fill-level second fill-tangerine" />
      </g>
      {/* roofs */}
      <polygon points="40,152 180,50 320,152" className="fill-ink" />
      <rect x="296" y="178" width="130" height="14" rx="4" className="fill-ink" />
      {/* windows and door */}
      <rect x="95" y="190" width="60" height="56" rx="6" className="fill-sunshine stroke-ink" strokeWidth="3" />
      <rect x="205" y="190" width="60" height="56" rx="6" className="fill-sunshine stroke-ink" strokeWidth="3" />
      <rect x="330" y="215" width="60" height="44" rx="6" className="fill-sunshine stroke-ink" strokeWidth="3" />
      <rect x="160" y="250" width="40" height="70" rx="6" className="fill-sunshine stroke-ink" strokeWidth="3" />
      {/* outlines on top of the paint */}
      <rect x="60" y="150" width="240" height="170" fill="none" className="stroke-ink" strokeWidth="3" strokeLinejoin="round" />
      <rect x="300" y="190" width="120" height="130" fill="none" className="stroke-ink" strokeWidth="3" strokeLinejoin="round" />
      {/* roller riding the paint line */}
      <g className="roller">
        <rect x="440" y="300" width="22" height="8" rx="3" className="fill-ink" />
        <rect x="448" y="308" width="5" height="34" rx="2" className="fill-ink" />
      </g>
    </svg>
  );
}
