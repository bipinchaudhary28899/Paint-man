import { FaqDirectory } from "~/components/content/Faq";
import { GradientText, InlineLink } from "~/components/content/Inline";
import { Page } from "~/components/site/Page";
import { CtaBanner, PageHero } from "~/components/site/Sections";
import { site } from "~/shared";

export { ScreenError as ErrorBoundary } from "~/components/content/NotFound";

// The website's /faq (src/app/(site)/faq/page.tsx) at phone width: the hero, the general and
// per-service questions, choosing colours, and the closing banner.
export default function FaqScreen() {
  return (
    <Page>
      <PageHero
        crumbs={[{ name: "FAQ", path: "/faq" }]}
        title={
          <>
            House painting <GradientText>questions</GradientText> in {site.city}, answered
          </>
        }
        intro={
          <>
            Can&apos;t find your answer? <InlineLink href="/book">Book an inspection</InlineLink> or <InlineLink href="/contact">contact us</InlineLink>.
          </>
        }
      />
      <FaqDirectory />
      <CtaBanner />
    </Page>
  );
}
