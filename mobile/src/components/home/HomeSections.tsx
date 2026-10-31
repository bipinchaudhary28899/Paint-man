import { StyleSheet } from "react-native";

import { Anchor } from "~/components/site/Page";
import { CtaBanner } from "~/components/site/Sections";
import { Reveal } from "~/components/ui/Reveal";
import { AreasSection } from "./AreasSection";
import { BeforeAfterSection } from "./BeforeAfterSection";
import { ColourExplorer } from "./ColourExplorer";
import { FaqSection } from "./FaqSection";
import { Finishes } from "./Finishes";
import { Hero } from "./Hero";
import { HomeBooking } from "./HomeBooking";
import { Journey } from "./Journey";
import { PinnedReveal } from "./PinnedReveal";
import { ServicesSection } from "./ServicesSection";
import { Trust } from "./Trust";

// The home page for a phone, shortest path first: the hero, what we paint (a swipe row of service cards),
// why us (one trust section), how the work gets done (one stepper), then the colour story (the reveal,
// the explorer, the drag-to-compare colour preview, the finishes), where we work, the booking form, the questions and the closing banner.
// Rendered inside <Page sections={...}>; each section is a direct child of the page so the scroll-driven
// ones re-measure when anything above them changes height. #top, #services and #colour are the anchors
// the bottom nav follows (CtaBanner registers #book); #book-visit is the booking card the hero's button,
// the journey's and the sticky pill glide to. Below the hero the sections fade and rise in the first
// time they scroll into view (Reveal; the trust section's blocks, the booking card and the banner do it
// themselves), all but the pinned reveal and the finishes collage, which move with the scroll already.
export function HomeSections() {
  return (
    <>
      <Anchor id="top">
        <Hero />
      </Anchor>
      <Anchor id="services">
        <Reveal>
          <ServicesSection />
        </Reveal>
      </Anchor>
      <Trust />
      <Reveal>
        <Journey />
      </Reveal>
      <PinnedReveal />
      {/* the reveal panel ends in 96px of padding (it clears the bottom nav while pinned), so the explorer pulls up 40px */}
      <Anchor id="colour" style={styles.colour}>
        <Reveal>
          <ColourExplorer />
        </Reveal>
      </Anchor>
      <Reveal>
        <BeforeAfterSection />
      </Reveal>
      <Finishes />
      <Reveal>
        <AreasSection />
      </Reveal>
      <HomeBooking />
      <Reveal>
        <FaqSection />
      </Reveal>
      {/* on phones the FAQ's bottom padding is the only gap above the banner */}
      <CtaBanner flushTop />
    </>
  );
}

const styles = StyleSheet.create({
  colour: { marginTop: -40 },
});
