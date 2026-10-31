import { useLocalSearchParams } from "expo-router";

import { ColourHero } from "~/components/colours/Hero";
import { LoadState } from "~/components/colours/Sections";
import { FamilyIntro, FamilyShades, SameFamily } from "~/components/colours/ShadeCards";
import { useLoad } from "~/components/colours/useLoad";
import { NotFoundContent } from "~/components/content/NotFound";
import { Page } from "~/components/site/Page";
import { BookingSection, CtaBanner } from "~/components/site/Sections";
import { Em } from "~/components/ui/Text";
import { fetchShadeCards, fetchShadeFamily, shadeCardPath } from "~/lib/colours";

// The website's /shade-cards/<brand>/<family> page on phones: every shade in one colour family of a
// brand's card, light to dark, with the code printed on the paper card; the same family on the other
// cards, the booking form and the closing banner. A family without a page shows the website's 404.

export default function ShadeFamilyScreen() {
  const { brand = "", family = "" } = useLocalSearchParams<{ brand: string; family: string }>();
  const one = useLoad(() => fetchShadeFamily(brand, family), `family:${brand}:${family}`);
  const list = useLoad(fetchShadeCards, "cards");
  const f = one.data?.family;

  if (one.error?.status === 404) {
    return (
      <Page>
        <NotFoundContent />
      </Page>
    );
  }
  if (!f || !one.data) {
    return (
      <Page>
        <ColourHero crumbs={[{ name: "Colours", path: "/colours" }, { name: "Shade cards", path: "/shade-cards" }]}>
          <LoadState error={one.error} retry={one.retry} loading="Loading the shades…" />
        </ColourHero>
      </Page>
    );
  }
  const card = list.data?.cards.find((c) => c.slug === f.brand);

  return (
    <Page>
      <ColourHero
        crumbs={[
          { name: "Colours", path: "/colours" },
          { name: "Shade cards", path: "/shade-cards" },
          { name: f.brandName, path: shadeCardPath(f.brand) },
          { name: f.label, path: shadeCardPath(f.brand, f.family) },
        ]}
        titleSize={40}
        titleLeading={1.04}
        title={
          <>
            {f.shortName} <Em>{f.family}</Em> shades with colour codes
          </>
        }
        intro={<FamilyIntro family={f} card={card} />}
      />

      <FamilyShades family={f} />

      <SameFamily family={f} cards={list.data?.cards ?? []} credit={one.data.credit} />

      <BookingSection
        style={{ marginTop: 96 }}
        heading={
          <>
            See {f.shortName} {f.family}s <Em>on your wall</Em>
          </>
        }
        text={`Add the codes you like under “Add more details”. The inspector brings the ${f.brandName} shade card to your site visit, so you see each shade in your own light. Zero advance payment.`}
      />

      <CtaBanner
        heading={
          <>
            Narrowed it down? <Em>See it on your wall.</Em>
          </>
        }
      />
    </Page>
  );
}
