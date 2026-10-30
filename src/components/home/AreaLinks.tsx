import Link from "next/link";
import { areaSlug, cityPath, type City } from "@/config/site";

/**
 * A city's "Painters in {area}" strip on the home page, each locality linking to its entry on that
 * city's page (/services/house-painting/<city>). The anchor comes from areaSlug() in
 * src/config/site.ts, which the city page uses for its ids. Phones and tablets show the links as chips (phones hide the
 * repeated "Painters in" visually, keeping it in the link name); desktop shows an underlined list.
 */
export function AreaLinks({ city }: { city: City }) {
  return (
    <ul className="mt-2.5 flex flex-wrap gap-2 font-medium tab:mt-3 tab:gap-2.5 desk:mt-1 desk:grid desk:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] desk:gap-x-6 desk:gap-y-0">
      {city.areas.map((a) => (
        <li key={a}>
          {/* Chips: at least 44px tall (46px on phones, as drawn). Desktop: 10px above and below a 24px line, so every link is
              at least a 44px tap target, and the first lines of names that wrap stay level with their
              neighbours. The text sits in one span so a flex chip keeps the space after "in"; on phones,
              where "Painters in" is visually hidden, that space starts the line and collapses. */}
          <Link
            href={`${cityPath(city)}#${areaSlug(a)}`}
            className="inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-4 text-[14px] transition-colors max-tab:min-h-[46px] hover:border-terracotta hover:text-terracotta desk:block desk:min-h-0 desk:rounded-none desk:border-0 desk:bg-transparent desk:px-0 desk:py-2.5 desk:text-base desk:underline desk:decoration-line-strong desk:decoration-1 desk:underline-offset-[5px] desk:hover:decoration-terracotta"
          >
            <span>
              <span className="max-tab:sr-only">Painters in</span> {a}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
