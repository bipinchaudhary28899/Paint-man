// Paint pouring from the top edge of the hero as the page scrolls.
// CSS-only: driven by a scroll timeline where supported, a one-shot pour elsewhere,
// and rendered in its settled state under prefers-reduced-motion (see globals.css).
// One per page, behind the hero; the pour stops well above the headline.

type Pour = { paint: "tangerine" | "pink" | "sunshine"; left: string; width: string; pour: string; drips: string[] };

const pours: Pour[] = [
  { paint: "tangerine", left: "58%", width: "18%", pour: "46%", drips: ["14%", "64%"] },
  { paint: "pink", left: "82%", width: "12%", pour: "30%", drips: ["40%"] },
  { paint: "sunshine", left: "44%", width: "8%", pour: "22%", drips: ["30%"] },
];

const fills = { tangerine: "bg-tangerine", pink: "bg-pink", sunshine: "bg-sunshine" };

export function PaintSpill() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
      {pours.map((p) => (
        <div
          key={p.paint}
          data-paint={p.paint}
          className={`spill ${fills[p.paint]}`}
          style={{ left: p.left, width: p.width, ["--pour" as string]: p.pour }}
        >
          {p.drips.map((d, i) => (
            <span key={d} className="spill-drip" style={{ left: d, animationDelay: i ? "0.9s" : undefined }} />
          ))}
        </div>
      ))}
    </div>
  );
}
