import { QuotationTerms } from "~/components/content/QuotationTerms";
import { Page } from "~/components/site/Page";

export { ScreenError as ErrorBoundary } from "~/components/content/NotFound";

// The website's /quotation-terms: the Terms & Conditions that come with every quotation.
export default function QuotationTermsScreen() {
  return (
    <Page>
      <QuotationTerms />
    </Page>
  );
}
