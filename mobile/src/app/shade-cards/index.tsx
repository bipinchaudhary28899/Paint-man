import { ColourHero } from "~/components/colours/Hero";
import { LoadState } from "~/components/colours/Sections";
import { HubCards, HubIntro } from "~/components/colours/ShadeCards";
import { useLoad } from "~/components/colours/useLoad";
import { Page } from "~/components/site/Page";
import { BookingSection, CtaBanner } from "~/components/site/Sections";
import { Em } from "~/components/ui/Text";
import { fetchShadeCards } from "~/lib/colours";

// The website's /shade-cards hub on phones: the cards of the major brands sold in India, each with its
// colour families, from /api/v1/colours/shade-cards; then the booking form and the closing banner.

export default function ShadeCardsScreen() {
  const list = useLoad(fetchShadeCards, "cards");
  return (
    <Page>
      <ColourHero
        crumbs={[
          { name: "Colours", path: "/colours" },
          { name: "Shade cards", path: "/shade-cards" },
        ]}
        titleSize={40}
        titleLeading={1.04}
        title={
          <>
            Paint shade cards from India&apos;s <Em>major brands</Em>
          </>
        }
        intro={list.data ? <HubIntro list={list.data} /> : undefined}
      >
        {!list.data && <LoadState error={list.error} retry={list.retry} loading="Loading the shade cards…" />}
      </ColourHero>

      {list.data && <HubCards list={list.data} />}

      <BookingSection
        style={{ marginTop: 96 }}
        heading={
          <>
            Shortlisted a few codes? <Em>Book the visit</Em>
          </>
        }
        text="Add the codes you like under “Add more details”. The inspector brings the brand's shade card to your site visit, so you see each shade in your own light. Zero advance payment."
      />

      <CtaBanner
        heading={
          <>
            Shortlisted a few codes? <Em>Book the visit.</Em>
          </>
        }
      />
    </Page>
  );
}
