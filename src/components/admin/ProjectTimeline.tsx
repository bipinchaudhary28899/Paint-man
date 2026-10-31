import { formatIstDateTime } from "@/lib/admin/ist";
import type { AdminProject } from "@/lib/projects/repo";

/** Every stage change and update, newest first, with the note the customer was shown. */
export function ProjectTimeline({ events }: { events: AdminProject["timeline"] }) {
  const newestFirst = [...events].reverse();
  return (
    <section aria-labelledby="timeline-heading" className="card p-5">
      <h2 id="timeline-heading" className="font-display text-xl font-normal">
        Timeline
      </h2>
      {newestFirst.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No events yet.</p>
      ) : (
        <ol className="mt-3 space-y-3 text-sm">
          {newestFirst.map((e) => (
            <li key={e.id} className="border-l-2 border-line-strong pl-3">
              <p className="font-semibold">{e.label}</p>
              <p className="text-xs text-muted">
                <time dateTime={e.at}>{formatIstDateTime(e.at)}</time>
              </p>
              {e.note && (
                <p className="mt-1">
                  <span className="text-muted">Customer sees: </span>
                  {e.note}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
