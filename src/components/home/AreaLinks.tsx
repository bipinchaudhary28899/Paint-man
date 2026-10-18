import Link from "next/link";
import { areaSlug } from "@/config/site";

/**
 * The home page's "Painters in {area}" strip, each locality linking to its entry on /areas. The
 * anchor comes from areaSlug() in src/config/site.ts, the same function /areas uses for its ids.
 */
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
