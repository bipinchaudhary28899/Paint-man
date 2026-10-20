import { CtaBanner } from "@/components/CtaBanner";
import { OutlineMarquee } from "@/components/Decor";
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
import { homeCity, site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: `Book House Painters Online in India | ${site.name}`,
  absoluteTitle: true,
  description: `Book painters online for one wall, a door, windows or the whole house: zero advance payment and a full estimate before work starts. Now painting in ${homeCity.name}.`,
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

      {/* ---------- Word strip ---------- */}
      <div className="relative z-[1] border-y border-line-soft">
        <OutlineMarquee words={["Texture", "Shine", "Colour", "Finish"]} />
      </div>

      <div className="relative z-[1]">
        <PinnedReveal />
      </div>

      {/* ---------- Promises ---------- */}
      <div className="container-page relative z-[1] mt-16 md:mt-[120px]">
        <Promises />
      </div>

      {/* ---------- How the work gets done ---------- */}
      <WorkFlow className="container-page relative z-[1] mt-16 md:mt-[120px]" cta={{ href: "#book-visit", label: "Book a site visit" }} />

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
