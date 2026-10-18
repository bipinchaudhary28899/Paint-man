import Link from "next/link";

/**
 * The anchor id of a locality on /areas: the name lower-cased with every run of other characters
 * turned into one hyphen ("Fatehabad Road" → "fatehabad-road"). /areas gives each locality
 * section the same id, so these links land on it.
 */
export function areaSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The home page's "Painters in {area}" strip, each locality linking to its section on /areas. */
export function AreaLinks({ areas }: { areas: readonly string[] }) {
  return (
    <ul className="grid flex-[2_1_480px] grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-6 font-medium">
      {areas.map((a) => (
        <li key={a}>
          {/* 10px above and below a 24px line: every link is at least a 44px tap target, and the first
              lines of names that wrap stay level with their neighbours */}
          <Link
            href={`/areas#${areaSlug(a)}`}
            className="block py-2.5 underline decoration-line-strong decoration-1 underline-offset-[5px] transition-colors hover:text-terracotta hover:decoration-terracotta"
          >
            Painters in {a}
          </Link>
        </li>
      ))}
    </ul>
  );
}
