import { AboutModel, Principles, WhereWeWork } from "~/components/content/About";
import { GradientText } from "~/components/content/Inline";
import { Page } from "~/components/site/Page";
import { CtaBanner, PageHero } from "~/components/site/Sections";
import { images, site } from "~/shared";

export { ScreenError as ErrorBoundary } from "~/components/content/NotFound";

// The website's /about (src/app/(site)/about/page.tsx) at phone width: the hero with the entrance
// photo, "Our model", "How we work", "Where we work" and the closing banner.
export default function AboutScreen() {
  return (
    <Page>
      <PageHero
        crumbs={[{ name: "About", path: "/about" }]}
        title={
          <>
            Managed house painting in {site.city}, made <GradientText>stress-free</GradientText>
          </>
        }
        intro={`Getting a home painted in ${site.city} usually means finding a painter, negotiating a rate, buying paint yourself and checking the work every day. ${site.name} takes all of that off your hands.`}
        image={images.homeEntrance}
      />
      <AboutModel />
      <Principles />
      <WhereWeWork />
      <CtaBanner />
    </Page>
  );
}
