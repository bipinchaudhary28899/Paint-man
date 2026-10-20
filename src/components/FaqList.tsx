import Link from "next/link";
import type { FaqItem } from "@/config/site";

// Visible FAQ accordion. An item's optional `link` points to the page that answers it in full;
// FAQPage JSON-LD (faqJsonLd) still uses only the question and answer text.
// Sizes step down per screen: phones (max-tab:) get 80px rows (8px padding) and 16px questions, tablets
// (tab:max-desk:) 68px rows and 18px questions, desktop 76px rows and 19px questions.
export function FaqList({ faqs, openFirst = false }: { faqs: FaqItem[]; openFirst?: boolean }) {
  return (
    <div className="rule-list flex flex-col">
      {faqs.map((f, i) => (
        <details key={f.q} open={openFirst && i === 0 ? true : undefined}>
          <summary className="flex min-h-[76px] items-center justify-between gap-4 text-[19px] font-medium max-tab:min-h-20 max-tab:gap-3.5 max-tab:py-2 tab:max-desk:min-h-[68px]">
            {/* The global h3 rule (DM Serif, weight 400) outranks layered utilities, so the phone and
                tablet designs' Manrope questions need the important modifier; desktop keeps the serif. */}
            <h3 className="font-sans text-[19px] font-medium tracking-normal max-desk:font-sans! max-tab:text-[16px] max-tab:leading-[1.35] max-tab:font-semibold! max-tab:tracking-[-0.005em]! tab:max-desk:text-[18px] tab:max-desk:font-medium! tab:max-desk:tracking-normal!">
              {f.q}
            </h3>
            <svg className="plus shrink-0 max-tab:size-[18px]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </summary>
          <div className="mb-7 max-w-[600px] max-tab:mb-[18px] tab:max-desk:mb-6 tab:max-desk:max-w-[640px]">
            <p className="leading-[1.65] text-muted max-desk:text-[15px] max-tab:leading-[1.6]">{f.a}</p>
            {f.link && (
              <Link
                href={f.link.href}
                className="mt-2 inline-flex min-h-11 items-center font-semibold underline decoration-terracotta decoration-2 underline-offset-4 hover:text-terracotta max-tab:mt-1 max-tab:text-[15px] tab:max-desk:mt-1.5"
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
