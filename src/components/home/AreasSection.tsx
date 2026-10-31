import Link from "next/link";
import { cityPath, liveCities, liveCityNames, type City } from "@/config/site";

/** "10 localities: Kamla Nagar, Dayalbagh, Sikandra and more" */
export const areaSummary = (c: City) => `${c.areas.length} localities: ${c.areas.slice(0, 3).join(", ")}${c.areas.length > 3 ? " and more" : ""}`;

// "Painting homes across Agra, Mathura and Vrindavan": one hairline row per live city (its name, how
// many localities and the first few), the whole row linking to the localities on the city's page.
// Every locality is still linked from the city page and the footer. Desktop keeps the heading beside the rows.
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
        </div>
        <ul className="mt-5 divide-y divide-line border-y border-line tab:mt-7 desk:mt-0 desk:flex-[2_1_480px]">
          {liveCities().map((c) => (
            <li key={c.slug}>
              <Link href={`${cityPath(c)}#localities`} className="group flex min-h-16 items-center justify-between gap-4 py-4 desk:py-5">
                <div>
                  <h3 className="text-[22px] leading-tight transition-colors group-hover:text-terracotta tab:text-2xl">Painters in {c.name}</h3>
                  <p className="mt-1 text-[14px] leading-normal text-muted tab:text-[15px]">{areaSummary(c)}</p>
                </div>
                <span aria-hidden className="text-lg text-terracotta transition-transform group-hover:translate-x-1 motion-reduce:transition-none">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
