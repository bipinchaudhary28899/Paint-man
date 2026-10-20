import { site } from "@/config/site";

// Rotating circular text badge.
export function SpinBadge({ className = "" }: { className?: string }) {
  return (
    <div className={`h-32 w-32 ${className || "relative"}`} aria-hidden>
      <svg viewBox="0 0 120 120" className="h-full w-full animate-spin-slow">
        <defs>
          <path id="badge-circle" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
        </defs>
        <circle cx="60" cy="60" r="58" fill="#ffd84d" stroke="#14121a" strokeWidth="2.5" />
        <text fontSize="11.5" fontWeight="800" letterSpacing="2.4" fill="#14121a">
          <textPath href="#badge-circle">BOOK AN INSPECTION • {site.city.toUpperCase()} •</textPath>
        </text>
      </svg>
    </div>
  );
}

const colours = [
  { name: "Terracotta", hex: "#d4643f" },
  { name: "Sage", hex: "#9cb59a" },
  { name: "Ochre", hex: "#e2a33b" },
  { name: "Teal", hex: "#0fa597" },
  { name: "Blush", hex: "#f2b8a6" },
  { name: "Indigo", hex: "#3d3f8f" },
  { name: "Ivory", hex: "#f3ead8" },
  { name: "Coral", hex: "#ff6f61" },
  { name: "Olive", hex: "#7c8a3a" },
  { name: "Lilac", hex: "#b7a6e8" },
];

// Scrolling band of paint colours.
export function ColourMarquee() {
  const row = [...colours, ...colours];
  return (
    <div className="overflow-hidden border-y-2 border-ink bg-ink py-4 [&:hover_.animate-marquee]:[animation-play-state:paused]" aria-hidden>
      <div className="flex w-max animate-marquee gap-10">
        {row.map((c, i) => (
          <span key={i} className="flex items-center gap-3 font-display text-2xl font-normal text-on-ink md:text-3xl">
            <span className="h-7 w-7 rounded-full border-2 border-on-ink" style={{ background: c.hex }} />
            {c.name}
          </span>
        ))}
      </div>
    </div>
  );
}

// Organic paint blob.
export function Blob({ className = "", color = "#ffd84d" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <path
        fill={color}
        d="M44.7,-58.5C57.1,-49.8,66,-35.6,70.6,-19.8C75.2,-4,75.5,13.4,68.6,27.3C61.7,41.2,47.6,51.6,32.3,59.5C17,67.4,0.5,72.8,-16.7,71.4C-33.9,70,-51.8,61.8,-62.4,48.1C-73,34.4,-76.3,15.2,-73.4,-2.3C-70.5,-19.8,-61.3,-35.6,-48.5,-44.3C-35.7,-53,-19.3,-54.7,-2.4,-51.7C14.5,-48.8,32.3,-67.2,44.7,-58.5Z"
        transform="translate(100 100)"
      />
    </svg>
  );
}
