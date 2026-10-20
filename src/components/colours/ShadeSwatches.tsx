import Link from "next/link";

// A grid of brand shades as on a paper shade card: the colour, the code printed on the card, the
// name and the LRV, all as text. Each swatch opens the colour finder on that shade, where it is
// shown on a room wall (the list's label says whose shades they are). Prefetch is off: a family page
// can hold hundreds of these links.

export type Swatch = {
  id: string;
  brand: string;
  /** the shade-card code, or null when the data has none (only the name is printed then) */
  code: string | null;
  /** what the finder is searched with: the code, or the name for a shade without one */
  query: string;
  name: string;
  hex: string;
  lrv: number;
};

export const swatchHref = (s: Pick<Swatch, "brand" | "query">) => `/colours?${new URLSearchParams({ brand: s.brand, q: s.query })}`;

export function ShadeSwatches({ shades, label }: { shades: Swatch[]; label: string }) {
  return (
    <ul aria-label={label} className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
      {shades.map((s) => (
        <li key={s.id}>
          <Link
            href={swatchHref(s)}
            prefetch={false}
            className="group flex h-full flex-col overflow-hidden rounded-[14px] border sm:rounded-[18px] border-line bg-paper transition hover:-translate-y-0.5 hover:border-ink/30"
          >
            <span aria-hidden className="block aspect-square w-full border-b border-line sm:aspect-[4/3]" style={{ backgroundColor: s.hex }} />
            <span className="flex flex-1 flex-col px-2 py-2 sm:px-3 sm:py-2.5">
              {s.code && <span className="text-xs font-bold tracking-wide break-words sm:text-sm">{s.code}</span>}
              <span className={s.code ? "text-xs leading-snug text-muted sm:text-sm" : "text-xs font-bold leading-snug sm:text-sm"}>{s.name}</span>
              <span className="mt-auto pt-1 text-[11px] text-muted sm:text-xs">LRV {s.lrv}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The CC BY 4.0 credit PaintDB's licence asks for wherever its shades are shown. */
export function PaintDbCredit({ source, licenseUrl, note }: { source: string; licenseUrl: string; note: string }) {
  return (
    <p className="text-sm leading-relaxed text-muted">
      Shade data:{" "}
      <a href={source} rel="noopener" className="font-semibold underline hover:text-ink">PaintDB</a>,{" "}
      <a href={licenseUrl} rel="noopener license" className="font-semibold underline hover:text-ink">CC BY 4.0</a>. {note} Screens
      vary, so confirm every shade on the brand&apos;s physical card before it goes on the wall.
    </p>
  );
}
