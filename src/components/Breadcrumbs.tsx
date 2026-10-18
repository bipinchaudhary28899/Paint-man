import Link from "next/link";
import { breadcrumbJsonLd } from "@/lib/seo";
import { JsonLd } from "./JsonLd";

export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(items)} />
      <nav aria-label="Breadcrumb" className="text-sm font-medium text-muted">
        <ol className="flex flex-wrap gap-1">
          <li><Link href="/" className="hover:text-tangerine-text">Home</Link></li>
          {items.map((item, i) => (
            <li key={item.path} className="flex gap-1">
              <span aria-hidden>/</span>
              {i === items.length - 1 ? (
                <span aria-current="page">{item.name}</span>
              ) : (
                <Link href={item.path} className="hover:text-tangerine-text">{item.name}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
