import { reviewMonth, reviewPlace, reviewsToShow, type ShownReviews } from "@/config/reviews";

/**
 * "What customers say": real customers' words from src/config/reviews.ts, each with their name,
 * locality, the job and the month. Left out entirely until there is one, except on a development
 * server, where the marked samples show the layout. Phones: the cards stacked; tablets and up: three across.
 */
export function Reviews({ shown = reviewsToShow(), className = "" }: { shown?: ShownReviews; className?: string }) {
  if (shown.items.length === 0) return null;
  return (
    <section aria-labelledby="reviews-heading" className={className}>
      <h2 id="reviews-heading" className="text-[30px] font-normal max-desk:leading-[1.06] tab:text-[44px] desk:text-5xl">
        What customers <em>say</em>
      </h2>
      {shown.sample && (
        <p className="mt-4 max-w-2xl rounded-pm-lg border border-dashed border-line-strong px-4 py-3 text-sm leading-normal text-muted">
          Sample reviews, shown only on a development server. Add real customers&apos; words to src/config/reviews.ts and these go away.
        </p>
      )}
      <ul className="mt-6 grid gap-3 tab:mt-8 tab:grid-cols-3 tab:gap-3.5 desk:gap-4">
        {shown.items.map((r, i) => (
          <li key={`${r.name}-${r.date}-${i}`} className="card p-[18px] max-desk:rounded-[18px] desk:p-6">
            <figure className="flex h-full flex-col gap-4">
              <blockquote className="text-[15px] leading-relaxed text-ink-soft desk:text-base">
                <p>{r.quote}</p>
              </blockquote>
              <figcaption className="mt-auto border-t border-line-soft pt-3 text-sm leading-normal text-muted">
                <span className="font-semibold text-ink">{r.name}</span>, {reviewPlace(r)}
                <span className="block">
                  {r.job} · {reviewMonth(r.date)}
                </span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
