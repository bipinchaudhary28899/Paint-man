import { useLocalSearchParams } from "expo-router";

import { ColourHero } from "~/components/colours/Hero";
import { LoadState } from "~/components/colours/Sections";
import { CardFamilies, CardIntro, OtherCards } from "~/components/colours/ShadeCards";
import { useLoad } from "~/components/colours/useLoad";
import { NotFoundContent } from "~/components/content/NotFound";
import { Page } from "~/components/site/Page";
import { BookingSection, CtaBanner } from "~/components/site/Sections";
import { Em } from "~/components/ui/Text";
import { fetchShadeCard, fetchShadeCards, shadeCardPath } from "~/lib/colours";

// The website's /shade-cards/<brand> page on phones: every colour family of the brand's card, light to
// dark, a spread of swatches from each with the code printed on the paper card, and a link to the
// family's own page; then the other cards, the booking form and the closing banner. A brand the
// website has no card for shows the website's 404.

export default function BrandShadeCardScreen() {
  const { brand = "" } = useLocalSearchParams<{ brand: string }>();
  const one = useLoad(() => fetchShadeCard(brand), `card:${brand}`);
  const list = useLoad(fetchShadeCards, "cards");
  const card = one.data?.card;

  if (one.error?.status === 404) {
    return (
      <Page>
        <NotFoundContent />
      </Page>
    );
  }
  if (!card || !one.data) {
    return (
      <Page>
        <ColourHero crumbs={[{ name: "Colours", path: "/colours" }, { name: "Shade cards", path: "/shade-cards" }]}>
          <LoadState error={one.error} retry={one.retry} loading="Loading the shade card…" />
        </ColourHero>
      </Page>
    );
  }

  return (
    <Page>
      <ColourHero
        crumbs={[
          { name: "Colours", path: "/colours" },
          { name: "Shade cards", path: "/shade-cards" },
          { name: card.name, path: shadeCardPath(card.slug) },
        ]}
        titleSize={40}
        titleLeading={1.04}
        title={
          <>
            {card.name} shade card with <Em>colour codes</Em>
          </>
        }
        intro={<CardIntro card={card} />}
      />

      <CardFamilies card={card} />

      <OtherCards card={card} cards={list.data?.cards ?? []} credit={one.data.credit} />

      <BookingSection
        style={{ marginTop: 96 }}
        heading={
          <>
            See the real {card.shortName} card <Em>at home</Em>
          </>
        }
        text={`Add the codes you like under “Add more details”. The inspector brings the ${card.name} shade card to your site visit, so you see each shade in your own light. Zero advance payment.`}
      />

      <CtaBanner
        heading={
          <>
            Picked a few {card.shortName} codes? <Em>Book the visit.</Em>
          </>
        }
      />
    </Page>
  );
}
