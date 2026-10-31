import { AfterContact, ContactHeroActions, ContactRows, Coverage, SendMessage } from "~/components/content/Contact";
import { GradientText } from "~/components/content/Inline";
import { Container, Page } from "~/components/site/Page";
import { PageHero } from "~/components/site/Sections";
import { site } from "~/shared";

export { ScreenError as ErrorBoundary } from "~/components/content/NotFound";

// The website's /contact (src/app/(site)/contact/page.tsx) at phone width: the hero with its two
// actions, the detail rows, the message form, the steps after you get in touch, and the localities
// and services we cover. The page has no closing banner on the website either.
export default function ContactScreen() {
  return (
    <Page>
      <PageHero
        crumbs={[{ name: "Contact", path: "/contact" }]}
        title={
          <>
            Contact our house painters in <GradientText>{site.city}</GradientText>
          </>
        }
        intro={`Questions about painting your home in ${site.city}? Send a message or book an inspection, and we call you back during working hours, ${site.hoursDisplay}.`}
      >
        <ContactHeroActions />
      </PageHero>
      <Container style={{ marginTop: 56 }}>
        <ContactRows />
        <SendMessage />
      </Container>
      <AfterContact />
      <Coverage />
    </Page>
  );
}
