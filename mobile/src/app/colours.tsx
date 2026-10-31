import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { ColourFinderFromParams } from "~/components/colours/ColourFinder";
import { ColourTools } from "~/components/colours/ColourTools";
import { ColourHero } from "~/components/colours/Hero";
import { ColourFaqs } from "~/components/colours/Sections";
import { useLoad } from "~/components/colours/useLoad";
import { Container, Page } from "~/components/site/Page";
import { CtaBanner } from "~/components/site/Sections";
import { Em } from "~/components/ui/Text";
import { fetchBrands, formatCount } from "~/lib/colours";
import { BRAND_SHADES_ROUNDED, liveCityNames, shadeCardBrands, site } from "~/shared";
import { colors } from "~/theme";

// The website's /colours page on phones: the hero with the colour tools, the shade finder (its
// brand, search, family and order from the screen's params, as the website reads them from the URL),
// "Colour questions", and the closing banner.

const colourFaqs = [
  {
    q: "Can I search Asian Paints, Berger or Nerolac shade codes?",
    a: `Yes. Pick the brand and type the code from its shade card, for example Asian Paints 7982 or Berger 3P0050, or search all ${shadeCardBrands.length} brands at once. On the quotation we write the exact brand, range and code you approve.`,
  },
  {
    q: "Will the wall look like the screen?",
    a: "Close, not identical. Daylight, tube lights and the finish (matt or sheen) all shift a shade. That is why the inspector brings physical shade cards and paints a test patch on your wall first.",
  },
  {
    q: "How do I choose a colour for a small room?",
    a: "Look at the LRV number on each shade. Above 60 reflects light and makes a small room feel bigger; below 35 is best for one feature wall with white around it.",
  },
];

export default function ColourFinderScreen() {
  const params = useLocalSearchParams<{ brand?: string; q?: string; family?: string; sort?: string; shade?: string }>();
  const list = useLoad(fetchBrands, "brands");
  const shades = list.data ? formatCount(list.data.shades) : BRAND_SHADES_ROUNDED;
  return (
    <Page>
      <ColourHero
        wash="sky"
        glows={[
          { color: colors.blush, size: 320, opacity: 0.6, place: { top: -96, right: -96 } },
          { color: colors.golden, size: 288, opacity: 0.5, place: { bottom: -128, left: "25%" } },
        ]}
        crumbs={[{ name: "Colours", path: "/colours" }]}
        title={
          <>
            Find a wall colour in {site.city} <Em>by shade code</Em>, brand or name
          </>
        }
        intro={`${shades} shades from Asian Paints, Berger, Nerolac and Nippon Paint, the major brands in India, searchable by the code on the shade card. Every one is shown on the same living room so you compare shade against shade. Pick one and we bring the real shade card to your home in ${liveCityNames("or")}.`}
      >
        <ColourTools current="finder" style={{ marginTop: 32 }} />
      </ColourHero>

      <Container style={{ marginTop: 48 }}>
        <View accessible accessibilityRole="header" accessibilityLabel="Search brand shades" />
        <ColourFinderFromParams list={list} params={params} />
      </Container>

      <ColourFaqs faqs={colourFaqs} style={{ marginTop: 96 }} />

      <CtaBanner heading="Found a shade? See it on your own wall." />
    </Page>
  );
}
