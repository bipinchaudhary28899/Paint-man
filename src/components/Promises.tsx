import { promises } from "@/config/site";
import { PromisesSwipe } from "@/components/PromisesSwipe";

/**
 * The service promises (zero advance payment, full estimate first, timed work, documented, quality,
 * advice in your interest) as cards. Phones: a swipe row of small numbered cards, with a counter
 * beside the heading and dots under the row. Tablets: six small numbered tiles, three across.
 * Desktop: terracotta-topped cards in three columns.
 */
export function Promises({ heading = true, className = "" }: { heading?: boolean; className?: string }) {
  return (
    <section aria-labelledby={heading ? "promises-heading" : undefined} aria-label={heading ? undefined : "What you can count on"} className={className}>
      <PromisesSwipe
        count={promises.length}
        label="Promises, swipe for more"
        heading={
          heading && (
            <h2 id="promises-heading" className="text-[30px] font-normal max-desk:leading-[1.06] tab:text-[44px] desk:text-5xl">
              What you can <em>count on</em>
            </h2>
          )
        }
      >
        <ul className="flex gap-3 tab:grid tab:grid-cols-3 tab:gap-3.5 desk:gap-4">
          {promises.map((p, i) => (
            <li
              key={p.title}
              className="card flex w-[min(286px,80vw)] shrink-0 snap-start flex-col gap-2.5 p-[18px] max-desk:rounded-[18px] tab:w-auto tab:pb-5 desk:block desk:border-t-4 desk:border-t-terracotta desk:p-5"
            >
              <span aria-hidden="true" className="flex size-[30px] items-center justify-center rounded-full bg-cream-wash font-display text-[13px] text-terracotta tab:size-8 tab:text-sm desk:hidden">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-[19px] font-normal leading-[1.15] desk:text-lg desk:leading-tight">{p.title}</h3>
              <p className="text-sm leading-normal text-muted tab:text-[13.5px] tab:leading-[1.55] desk:mt-1.5 desk:text-sm desk:leading-relaxed">{p.text}</p>
            </li>
          ))}
        </ul>
      </PromisesSwipe>
    </section>
  );
}
