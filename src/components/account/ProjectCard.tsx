import Image from "next/image";
import Link from "next/link";
import { illustrations } from "@/config/images";
import { formatDate, placeLine } from "@/lib/account";
import { formatPaise } from "@/lib/money";
import type { ProjectSummary } from "@/lib/projects/repo";
import { MAIN_STAGES, mainIndex, stageExplanation, type ProjectStage } from "@/lib/projects/stages";

// The account page's "My projects": one card per project (service, place, stage, last update, the
// final price once agreed), each opening its tracker, or the empty state with the booking link.

export const projectPath = (id: string) => `/account/projects/${id}`;

const pillTone = (stage: ProjectStage) =>
  stage === "completed" ? "bg-sage-deep text-on-sage" : stage === "cancelled" ? "bg-cream-wash text-muted" : stage === "on_hold" ? "bg-golden/35 text-ink" : "bg-sand text-ink";

/** The stage as a small pill: sand while moving, sage when handed over, golden on hold, quiet when cancelled. */
export function StagePill({ stage, label }: { stage: ProjectStage; label: string }) {
  return <span className={`inline-flex min-h-7 shrink-0 items-center rounded-full px-3 text-xs font-semibold ${pillTone(stage)}`}>{label}</span>;
}

/** How far along the main line a project is: one segment per stage, the reached ones filled. */
export function StageProgress({ stage }: { stage: ProjectStage }) {
  const at = mainIndex(stage);
  if (at === -1) return null;
  return (
    <div className="mt-4">
      <p className="sr-only">
        Stage {at + 1} of {MAIN_STAGES.length}
      </p>
      <div aria-hidden className="flex gap-1">
        {MAIN_STAGES.map((s, i) => (
          <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= at ? (stage === "completed" ? "bg-sage-deep" : "bg-terracotta") : "bg-line"}`} />
        ))}
      </div>
    </div>
  );
}

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const place = placeLine(project.locality, project.city);
  return (
    <article className="card card-hover relative p-5 tab:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <h3 className="text-2xl leading-tight">
          {/* the whole card is the link (its ::after covers it); the heading names it */}
          <Link href={projectPath(project.id)} className="after:absolute after:inset-0 after:rounded-[20px] after:content-[''] hover:text-terracotta">
            {project.service ?? "House painting"}
          </Link>
        </h3>
        <StagePill stage={project.stage} label={project.stageLabel} />
      </div>
      {place && <p className="mt-1 text-[15px] text-muted">{place}</p>}
      <StageProgress stage={project.stage} />
      <p className="mt-3 text-[15px] leading-relaxed">{stageExplanation(project.stage)}</p>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line-soft pt-3 text-sm">
        <p className="text-muted">Last update {formatDate(project.updatedAt)}</p>
        {project.finalPricePaise !== undefined && (
          <p>
            Final price <span className="font-semibold">{formatPaise(project.finalPricePaise)}</span>
          </p>
        )}
      </div>
    </article>
  );
}

/** No projects yet: what will appear here, and the booking link. */
export function ProjectsEmpty() {
  return (
    <div className="card mt-5 grid items-center gap-6 p-6 tab:grid-cols-[1fr_160px] tab:p-8">
      <div>
        <p className="font-display text-2xl">No projects yet</p>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Book an inspection with this mobile number and it shows up here: the call, the site visit, your itemised quotation and the work, step by step.
        </p>
        <Link href="/book" className="btn-primary mt-5">
          Book a free inspection
        </Link>
        <p className="mt-4 text-sm leading-relaxed text-muted">Booked with another number? Log out and log in with that number to see it.</p>
      </div>
      <Image
        src={illustrations.paintCan.src}
        alt=""
        width={illustrations.paintCan.width}
        height={illustrations.paintCan.height}
        sizes="160px"
        className="mx-auto hidden h-auto w-40 tab:block"
      />
    </div>
  );
}
