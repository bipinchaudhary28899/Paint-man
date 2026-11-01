import { InlineLink } from "~/components/content/Inline";
import { ProseH2, ProseP, ProsePage } from "~/components/content/Prose";
import { Page } from "~/components/site/Page";

export { ScreenError as ErrorBoundary } from "~/components/content/NotFound";

// The website's /terms (src/app/(site)/terms/page.tsx), word for word. Starter text only, as on the
// website: to be reviewed by a qualified professional before launch.
export default function TermsScreen() {
  return (
    <Page>
      <ProsePage title="Terms of service" path="/terms">
        <ProseH2>Enquiries and inspections</ProseH2>
        <ProseP>Submitting a booking request does not create a contract. It lets us contact you to arrange a site inspection.</ProseP>
        <ProseH2>Quotations</ProseH2>
        <ProseP>
          Each quotation lists the scope, materials, inclusions, exclusions, price, payment schedule and validity period. Work begins only after you approve a
          quotation.
        </ProseP>
        <ProseH2>Changes in scope</ProseH2>
        <ProseP>Any additional work or change of material is priced and approved by you before it is carried out.</ProseP>
        <ProseH2>Payments, cancellations and refunds</ProseH2>
        <ProseP>
          Payment milestones are stated in your quotation. Payments, cancellation, refunds and everything else about the work are covered by the{" "}
          <InlineLink href="/quotation-terms" plain>
            quotation terms
          </InlineLink>{" "}
          that come with every quotation.
        </ProseP>
        <ProseH2>Service terms</ProseH2>
        <ProseP>
          The workmanship warranty and after-service commitments are set out in the{" "}
          <InlineLink href="/quotation-terms#warranty" plain>
            quotation terms
          </InlineLink>
          .
        </ProseP>
        <ProseH2>Contact</ProseH2>
        <ProseP>
          Questions about these terms? Reach us through our{" "}
          <InlineLink href="/contact" plain>
            contact page
          </InlineLink>
          .
        </ProseP>
      </ProsePage>
    </Page>
  );
}
