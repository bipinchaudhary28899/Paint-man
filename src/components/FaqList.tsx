import Link from "next/link";
import type { FaqItem } from "@/config/site";

// Visible FAQ accordion. An item's optional `link` points to the page that answers it in full;
// FAQPage JSON-LD (faqJsonLd) still uses only the question and answer text.
export function FaqList({ faqs, openFirst = false }: { faqs: FaqItem[]; openFirst?: boolean }) {
  return (
    <div className="rule-list flex flex-col">
      {faqs.map((f, i) => (
        <details key={f.q} open={openFirst && i === 0 ? true : undefined}>
          <summary className="flex min-h-[76px] items-center justify-between gap-4 text-[19px] font-medium">
            <h3 className="font-sans text-[19px] font-medium tracking-normal">{f.q}</h3>
            <svg className="plus shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </summary>
          <div className="mb-7 max-w-[600px]">
            <p className="leading-[1.65] text-muted">{f.a}</p>
            {f.link && (
              <Link
                href={f.link.href}
                className="mt-2 inline-flex min-h-11 items-center font-semibold underline decoration-terracotta decoration-2 underline-offset-4 hover:text-terracotta"
              >
                {f.link.label} →
              </Link>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
