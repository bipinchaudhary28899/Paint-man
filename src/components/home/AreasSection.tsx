import Link from "next/link";
import { cityPath, liveCities, liveCityNames } from "@/config/site";
import { AreaLinks } from "./AreaLinks";

// "Painting homes across Agra, Mathura and Vrindavan": each live city's localities under the city's
// name (a link to its page), each locality linking to its entry there. Phones and tablets show the
// localities as chips under the heading; desktop keeps the heading beside underlined lists.
export function AreasSection() {
  return (
    <section className="container-page relative z-[1] pb-14 tab:pb-[88px] desk:pb-40" aria-labelledby="areas-heading">
      <div className="border-t border-line pt-9 tab:pt-12 desk:flex desk:flex-wrap desk:items-start desk:gap-12 desk:pt-14">
        <div className="desk:flex-[1_1_300px]">
          <h2 id="areas-heading" className="text-[34px] leading-[1.1] max-tab:text-[26px] max-tab:leading-[1.12]">
            Painting homes across {liveCityNames()}
          </h2>
          <p className="mt-3 leading-[1.6] text-muted max-tab:mt-2.5 max-tab:text-[14px] max-tab:leading-[1.55] tab:max-desk:max-w-[480px] tab:max-desk:text-[15px] desk:max-w-[360px]">
            Mohalla list mein nahi hai? If you need painters outside these localities, ask. We&apos;ll tell you honestly if we can supervise your job.
          </p>
          {/* Phones drop the repeated "Painters in" from each chip and show it once here; the links
              still carry it for screen readers, so this label is hidden from them. */}
          <p aria-hidden className="mt-[18px] text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-2 tab:hidden">
            Painters in
          </p>
        </div>
        <div className="space-y-6 max-tab:mt-1 tab:mt-6 desk:mt-0 desk:flex-[2_1_480px] desk:space-y-8">
          {liveCities().map((c) => (
            <div key={c.slug}>
              <h3 className="text-[22px] leading-tight tab:text-2xl">
                <Link href={cityPath(c)} className="hover:text-terracotta">{c.name}</Link>
              </h3>
              <AreaLinks city={c} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
