import { Text } from "react-native";

import { ColourTools } from "~/components/colours/ColourTools";
import { ColourHero, HeroText } from "~/components/colours/Hero";
import { PaletteJump, PaletteList } from "~/components/colours/Palettes";
import { useLoad } from "~/components/colours/useLoad";
import { Page } from "~/components/site/Page";
import { CtaBanner } from "~/components/site/Sections";
import { Em } from "~/components/ui/Text";
import { fetchPaletteFacts } from "~/lib/colours";
import { openHref } from "~/lib/links";
import { liveCityNames, PAINTDB, palettes, site } from "~/shared";
import { colors, fonts } from "~/theme";

// The website's /palettes page on phones: the hero with the colour tools and the jump chips, a card
// per palette (the website's own palettes), the credit and the closing banner. Each shade's LRV and
// its closest Berger and Nerolac shades come from /api/v1/palettes and fill in once it answers.

export default function ColourCombinationsScreen() {
  const facts = useLoad(fetchPaletteFacts, "palettes");
  return (
    <Page>
      <ColourHero
        glows={[
          { color: colors.sageDeep, size: 320, opacity: 0.3, place: { top: -96, right: -96 } },
          { color: colors.blush, size: 288, opacity: 0.5, place: { bottom: -128, left: "25%" } },
        ]}
        crumbs={[{ name: "Palettes", path: "/palettes" }]}
        title={
          <>
            Wall colour combinations for {site.city} homes that <Em>already work</Em>
          </>
        }
        intro={
          <HeroText>
            Ready-made colour combinations, three shades per room: the feature wall, the white around it and one accent. Each shade is an Asian Paints shade-card code, shown with the
            closest Berger and Nerolac shades. They are set out the way our inspector proposes colours on a site visit in {liveCityNames("or")}, and we bring all three shade cards to
            your home. Not sure yet?{" "}
            <Text accessibilityRole="link" onPress={() => openHref("/colours")} style={{ fontFamily: fonts.sansBold, color: colors.sageDeep, textDecorationLine: "underline" }}>
              Search single shades
            </Text>{" "}
            and see each one on the same room.
          </HeroText>
        }
      >
        <ColourTools current="palettes" style={{ marginTop: 32 }} />
        <PaletteJump palettes={palettes} />
      </ColourHero>

      <PaletteList palettes={palettes} facts={facts.data ?? {}} loading={facts.loading} credit={PAINTDB} />

      <CtaBanner heading="Like a palette? We bring the three shade cards to your home." />
    </Page>
  );
}
