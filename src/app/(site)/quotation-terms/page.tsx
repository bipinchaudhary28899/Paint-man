import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { acceptanceStatement, QUOTATION_TERMS_UPDATED, quotationTerms, WORKMANSHIP_DAYS } from "@/config/quotation-terms";
import { site } from "@/config/site";
import { formatDate } from "@/lib/account";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: `Quotation Terms for House Painting in ${site.city}`,
  description: `Every ${site.name} quotation comes with these terms: no advance payment, milestone payments, written approval for changes and a ${WORKMANSHIP_DAYS}-day workmanship check.`,
  path: "/quotation-terms",
});

// The Terms & Conditions that come with every quotation (src/config/quotation-terms.ts), as the
// quotation PDF prints them after the quotation. The app shows the same text at the same path.
export default function QuotationTermsPage() {
  const acceptance = acceptanceStatement();
  return (
    <div className="container-page max-w-3xl py-10">
      <Breadcrumbs items={[{ name: "Quotation terms", path: "/quotation-terms" }]} />
      <h1 className="mt-6 text-3xl font-normal text-brand-900">
        Quotation terms and <em>conditions</em>
      </h1>
      <div className="prose-page">
        <p>
          These Terms &amp; Conditions come with every {site.name} quotation, whatever the job: interior or exterior, home or business. They are printed in each quotation&apos;s
          PDF after the quotation itself, and both carry the same reference number. Last updated {formatDate(QUOTATION_TERMS_UPDATED)}.
        </p>
        {quotationTerms().map((section, i) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`}>
            <h2 id={`${section.id}-heading`}>
              {i + 1}. {section.title}
            </h2>
            {section.blocks.map((block, j) =>
              block.kind === "p" ? (
                <p key={j}>{block.text}</p>
              ) : (
                <ul key={j}>
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ),
            )}
          </section>
        ))}
        <section id="acceptance" aria-labelledby="acceptance-heading">
          <h2 id="acceptance-heading">{acceptance.title}</h2>
          <p>Accepting a quotation, by signing it, in the {site.name} app or in writing, means accepting these terms with it:</p>
          <ul>
            {acceptance.paragraphs.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
        <p>
          Using this website is covered by our <Link href="/terms" className="underline">terms of service</Link>. Questions about these terms? Reach us through our{" "}
          <Link href="/contact" className="underline">
            contact page
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
