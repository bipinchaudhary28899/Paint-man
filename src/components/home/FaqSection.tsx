import { FaqList } from "@/components/FaqList";
import { generalFaqs } from "@/config/site";

// "Good questions": the general FAQs (shown here; marked up once site-wide, on /faq). Phones stack the
// heading, note and accordion; tablets put the note beside the heading above a full-width accordion;
// desktop sets the heading beside the accordion.
export function FaqSection() {
  return (
    <section id="faq" className="container-page relative z-[1] pb-14 pt-1.5 tab:pb-[88px] tab:pt-0 desk:flex desk:flex-wrap desk:gap-[72px] desk:pb-40" aria-labelledby="faq-heading">
      <div className="tab:max-desk:flex tab:max-desk:items-end tab:max-desk:justify-between tab:max-desk:gap-6 desk:flex-[1_1_320px]">
        <h2 id="faq-heading" className="text-[32px] leading-[1.06] tab:text-[44px] desk:text-[clamp(36px,4vw,52px)]">
          Good <em>questions.</em>
        </h2>
        <p className="mt-4 max-w-[320px] leading-[1.6] text-muted max-tab:mt-2 max-tab:text-[14px] max-tab:leading-[1.55] tab:max-desk:mt-0 tab:max-desk:max-w-[300px] tab:max-desk:text-[15px]">
          Anything else? Our inspector answers it on the site visit.
        </p>
      </div>
      <div className="mt-4 tab:mt-6 desk:mt-0 desk:flex-[2_1_560px]">
        <FaqList faqs={generalFaqs} openFirst />
      </div>
    </section>
  );
}
