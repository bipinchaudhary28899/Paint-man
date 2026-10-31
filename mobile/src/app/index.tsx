import { HomeSections } from "~/components/home/HomeSections";
import { Page } from "~/components/site/Page";

/** The home page's sections: the bottom nav's Home glides back to the first. */
const HOME_SECTIONS = ["top", "services", "colour", "book"] as const;

// The website's / page (src/app/(site)/page.tsx) at its phone layout, section by section.
export default function HomeScreen() {
  return (
    <Page sections={HOME_SECTIONS}>
      <HomeSections />
    </Page>
  );
}
