import Link from "next/link";
import { cityPath, liveCities } from "@/config/site";

/**
 * "Agra, Mathura and Vrindavan" with each name linking to its city page: the cities we paint in,
 * wherever copy says where we work, so a new live city shows up everywhere at once.
 */
export function LiveCityLinks({ linkClassName, conjunction = "and" }: { linkClassName: string; conjunction?: "and" | "or" }) {
  const live = liveCities();
  return (
    <>
      {live.map((c, i) => (
        <span key={c.slug}>
          {i > 0 && (i === live.length - 1 ? ` ${conjunction} ` : ", ")}
          <Link href={cityPath(c)} className={linkClassName}>
            {c.name}
          </Link>
        </span>
      ))}
    </>
  );
}
