import { GalleryGroups, GalleryNav, GalleryNote } from "~/components/content/Gallery";
import { InlineLink } from "~/components/content/Inline";
import { Container, Page } from "~/components/site/Page";
import { CtaBanner, PageHero } from "~/components/site/Sections";
import { Em } from "~/components/ui/Text";
import { liveCityNames } from "~/shared";

export { ScreenError as ErrorBoundary } from "~/components/content/NotFound";

// The website's /gallery (src/app/(site)/gallery/page.tsx) at phone width: the hero, the note that
// these are example homes, the section chips, every group's photos and the closing banner.
export default function GalleryScreen() {
  return (
    <Page>
      <PageHero
        crumbs={[{ name: "Gallery", path: "/gallery" }]}
        title={
          <>
            Home painting <Em>ideas</Em> from Indian homes
          </>
        }
        intro={
          <>
            Ghar ke liye rang chun rahe hain? Living rooms, bedrooms, kitchens, doors and house fronts from homes across India, to help you picture yours. Find any
            shade in the <InlineLink href="/colours">colour finder</InlineLink>, and our inspector brings the real shade cards to your home in {liveCityNames("or")}.
          </>
        }
      />
      <Container style={{ marginTop: 40 }}>
        <GalleryNote />
        <GalleryNav />
        <GalleryGroups />
      </Container>
      <CtaBanner
        heading={
          <>
            Seen a colour you like? <Em>Let&apos;s paint it.</Em>
          </>
        }
      />
    </Page>
  );
}
