import { HomeSections } from "~/components/home/HomeSections";
import { Page } from "~/components/site/Page";

/** The bottom nav follows these sections on the home page, as the website's phone nav does. */
const HOME_SECTIONS = ["top", "services", "colour", "book"] as const;

// The website's / page (src/app/(site)/page.tsx) at its phone layout, section by section.
export default function HomeScreen() {
  return (
    <Page sections={HOME_SECTIONS}>
      <HomeSections />
    </Page>
  );
}
