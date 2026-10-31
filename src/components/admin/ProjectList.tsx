import Link from "next/link";
import { formatPaise } from "@/lib/money";
import type { AdminProjectSummary } from "@/lib/projects/repo";
import { MAIN_STAGES, OFF_LINE_STAGES, STAGE_LABELS, formatVisit, type ProjectStage } from "@/lib/projects/stages";

// The /admin projects list: a plain GET form for the filters (works without JavaScript, and the
// URL keeps them, so a filtered list can be bookmarked or shared with the team) and the table.

/** The tint of a stage's pill: done and live work in sage, paused in sand, cancelled muted. */
export function stageTint(stage: ProjectStage): string {
  if (stage === "cancelled") return "bg-chalk text-muted";
  if (stage === "on_hold") return "bg-peach-wash text-ink";
  if (stage === "completed") return "bg-sage-deep text-on-sage";
  return "bg-sky-wash text-ink";
}

export function StagePill({ stage }: { stage: ProjectStage }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${stageTint(stage)}`}>{STAGE_LABELS[stage]}</span>;
}

export type ProjectFilterValues = { stage?: string; city?: string; q?: string };

/** Search by name or phone, and filter by stage and city. Submitting loads /admin/projects with the choices in the URL. */
export function ProjectFilters({ values, cities, shown, total }: { values: ProjectFilterValues; cities: { slug: string; name: string }[]; shown: number; total: number }) {
  const filtered = Boolean(values.stage || values.city || values.q);
  return (
    // keyed by the filters, so a client-side navigation to other filters shows them (the fields are uncontrolled)
    <form key={projectsHref(values)} method="get" action="/admin/projects" role="search" className="mt-8 flex flex-wrap items-center gap-3">
      <label htmlFor="project-search" className="sr-only">Search projects by name or phone</label>
      <input id="project-search" name="q" type="search" defaultValue={values.q ?? ""} maxLength={80} placeholder="Search name or phone…" className="field max-w-xs" />
      <label htmlFor="project-stage" className="sr-only">Stage</label>
      <select id="project-stage" name="stage" defaultValue={values.stage ?? ""} className="field w-auto">
        <option value="">Any stage</option>
        {[...MAIN_STAGES, ...OFF_LINE_STAGES].map((s) => (
          <option key={s} value={s}>
            {STAGE_LABELS[s]}
          </option>
        ))}
      </select>
      <label htmlFor="project-city" className="sr-only">City</label>
      <select id="project-city" name="city" defaultValue={values.city ?? ""} className="field w-auto">
        <option value="">All cities</option>
        {cities.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
      <button type="submit" className="btn-primary !min-h-11 !px-5 text-sm">
        Filter
      </button>
      {filtered && (
        <a href="/admin/projects" className="btn-secondary !min-h-11 !px-4 text-sm">
          Clear filters
        </a>
      )}
      <p className="text-sm text-muted">
        {shown === total ? `${total} project${total === 1 ? "" : "s"}` : `${shown} of ${total} shown`}
      </p>
    </form>
  );
}

/** The projects, most recently updated first; each name opens the project. */
export function ProjectList({ items, filtered }: { items: AdminProjectSummary[]; filtered: boolean }) {
  if (items.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border border-dashed border-line-strong p-10 text-center text-muted">
        <p>{filtered ? "No projects match these filters." : "No projects yet. Every booking opens one, in “Booking received”."}</p>
      </div>
    );
  }
  return (
    <div className="relative mt-6 max-h-[70vh] overflow-auto rounded-2xl border border-line bg-paper">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="sticky top-0 z-10 bg-ink text-on-ink">
          <tr>
            {["Customer", "Phone", "Service", "City / locality", "Stage", "Last update", "Final price"].map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id} className="border-t border-line align-top">
              <td className="px-4 py-3">
                <Link href={`/admin/projects/${p.id}`} className="font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:text-tangerine-text">
                  {p.name}
                </Link>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <a href={`tel:+91${p.phone.replace(/\D/g, "").slice(-10)}`} className="text-tangerine-text underline">
                  {p.phone}
                </a>
              </td>
              <td className="px-4 py-3">{p.service ?? "—"}</td>
              <td className="px-4 py-3">{[p.locality, p.city].filter(Boolean).join(", ") || "—"}</td>
              <td className="px-4 py-3">
                <StagePill stage={p.stage} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted">{formatVisit(p.updatedAt)}</td>
              <td className="whitespace-nowrap px-4 py-3 font-semibold">{p.finalPricePaise !== undefined ? formatPaise(p.finalPricePaise) : <span className="font-normal text-muted">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** /admin/projects with these filters and page (blank values and page 1 left out). */
export function projectsHref(values: ProjectFilterValues, page = 1): string {
  const params = new URLSearchParams();
  for (const key of ["q", "stage", "city"] as const) if (values[key]) params.set(key, values[key]);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/projects?${query}` : "/admin/projects";
}

/** Previous / next page links under the list, keeping the filters. */
export function ProjectPages({ values, page, pages }: { values: ProjectFilterValues; page: number; pages: number }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pages" className="mt-4 flex items-center gap-3 text-sm">
      {page > 1 && (
        <Link href={projectsHref(values, page - 1)} className="btn-secondary !min-h-11 !px-4 text-sm">
          Previous
        </Link>
      )}
      <span className="text-muted">
        Page {page} of {pages}
      </span>
      {page < pages && (
        <Link href={projectsHref(values, page + 1)} className="btn-secondary !min-h-11 !px-4 text-sm">
          Next
        </Link>
      )}
    </nav>
  );
}
