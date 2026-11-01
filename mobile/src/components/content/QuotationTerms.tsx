import { InlineLink } from "~/components/content/Inline";
import { ProseH2, ProseList, ProseP, ProsePage } from "~/components/content/Prose";
import { Anchor } from "~/components/site/Page";
import { formatDate } from "~/lib/dates";
import { acceptanceStatement, QUOTATION_TERMS_UPDATED, quotationTerms, site } from "~/shared";

// The website's /quotation-terms: the Terms & Conditions that come with every quotation, from the
// website's own src/config/quotation-terms.ts (the same text the quotation PDF prints), section by
// section, then what accepting a quotation means.
export function QuotationTerms() {
  const acceptance = acceptanceStatement();
  return (
    <ProsePage title="Quotation terms and conditions" path="/quotation-terms">
      <ProseP>
        These Terms &amp; Conditions come with every {site.name} quotation, whatever the job: interior or exterior, home or business. They are printed in each quotation&apos;s PDF
        after the quotation itself, and both carry the same reference number. Last updated {formatDate(QUOTATION_TERMS_UPDATED)}.
      </ProseP>
      {quotationTerms().map((section, i) => (
        <ProseSection key={section.id} id={section.id} number={i + 1} title={section.title} blocks={section.blocks} />
      ))}
      <ProseH2>{acceptance.title}</ProseH2>
      <ProseP>Accepting a quotation, by signing it, in the {site.name} app or in writing, means accepting these terms with it:</ProseP>
      <ProseList items={acceptance.paragraphs} />
      <ProseP>
        Using the website and this app is covered by our{" "}
        <InlineLink href="/terms" plain>
          terms of service
        </InlineLink>
        . Questions about these terms? Reach us through our{" "}
        <InlineLink href="/contact" plain>
          contact page
        </InlineLink>
        .
      </ProseP>
    </ProsePage>
  );
}

/** One numbered section, anchored at its id (the website's #warranty and the like). */
function ProseSection({ id, number, title, blocks }: { id: string; number: number; title: string; blocks: ReturnType<typeof quotationTerms>[number]["blocks"] }) {
  return (
    <>
      <Anchor id={id}>
        <ProseH2>
          {number}. {title}
        </ProseH2>
      </Anchor>
      {blocks.map((block, j) => (block.kind === "p" ? <ProseP key={j}>{block.text}</ProseP> : <ProseList key={j} items={block.items} />))}
    </>
  );
}
