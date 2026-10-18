import Link from "next/link";
import { breadcrumbJsonLd } from "@/lib/seo";
import { JsonLd } from "./JsonLd";

// Each link's tap target is at least 44px tall (and a little wider than its text); the negative
// margins cancel the padding, so the trail keeps its text height and nothing below it moves.
const crumbLink = "-mx-1.5 -my-3 inline-flex min-h-11 items-center px-1.5 hover:text-tangerine-text";

export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(items)} />
      <nav aria-label="Breadcrumb" className="text-sm font-medium text-muted">
        <ol className="flex flex-wrap gap-1">
          <li className="flex"><Link href="/" className={crumbLink}>Home</Link></li>
          {items.map((item, i) => (
            <li key={item.path} className="flex gap-1">
              <span aria-hidden>/</span>
              {i === items.length - 1 ? (
                <span aria-current="page">{item.name}</span>
              ) : (
                <Link href={item.path} className={crumbLink}>{item.name}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
