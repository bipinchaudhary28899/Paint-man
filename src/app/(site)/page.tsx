import { CtaBanner } from "@/components/CtaBanner";
import { AreasSection } from "@/components/home/AreasSection";
import { ColourExplorer } from "@/components/home/ColourExplorer";
import { Diagnose } from "@/components/home/Diagnose";
import { FaqSection } from "@/components/home/FaqSection";
import { Finishes } from "@/components/home/Finishes";
import { Hero } from "@/components/home/Hero";
import { HomeBooking } from "@/components/home/HomeBooking";
import { PaintSaathiWay } from "@/components/home/PaintSaathiWay";
import { ParallaxChips } from "@/components/home/ParallaxChips";
import { PinnedReveal } from "@/components/home/PinnedReveal";
import { ProcessSection } from "@/components/home/ProcessSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { Promises } from "@/components/Promises";
import { WorkFlow } from "@/components/WorkFlow";
import { liveCityNames, site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: `Book House Painters Online in India | ${site.name}`,
  absoluteTitle: true,
  description: `Book painters online for a wall, a door or the whole house, with zero advance and a full estimate first. Now painting in ${liveCityNames()}.`,
  path: "/",
});

// The home page, section by section (each in src/components/home). Three designs: phones (under
// 721px), tablets (tab:, 721px up) and desktop (desk:, 1080px up); see the breakpoints in globals.css.
export default function HomePage() {
  return (
    <div className="relative overflow-x-clip">
      {/* General FAQs are marked up once site-wide, on /faq; this page only shows them. */}
      <ParallaxChips />

      <Hero />

      <HomeBooking />

      <div className="relative z-[1]">
        <PinnedReveal />
      </div>

      {/* ---------- Promises ---------- */}
      {/* Phones: the reveal panel above ends in 96px of padding (it clears the bottom nav while pinned),
          so the promises pull up 40px to keep the 56px gap between sections. */}
      <div className="container-page relative z-[1] -mt-10 tab:mt-16 md:mt-[120px]">
        <Promises />
      </div>

      {/* ---------- How the work gets done ---------- */}
      <WorkFlow className="container-page relative z-[1] mt-14 tab:mt-16 md:mt-[120px]" cta={{ href: "#book-visit", label: "Book a site visit" }} />

      <Diagnose />

      <PaintSaathiWay />

      <ServicesSection />

      <ProcessSection />

      <div className="relative z-[1]">
        <ColourExplorer />
      </div>

      <Finishes />

      <AreasSection />

      <FaqSection />

      <div className="relative z-[1]">
        <CtaBanner />
      </div>
    </div>
  );
}
