import { personalOk } from "@/lib/api-personal";
import { detailSteps, stepsProgress } from "./details";
import type { ProjectDetail } from "./repo";

/**
 * A customer's project in the API envelope (GET and PATCH /api/v1/projects/{id}, and accepting a
 * quotation): the project, a one-line label, the quotation and detail-step counts, and its links.
 * `label` replaces the default line when the answer says what just happened.
 */
export function projectResponse(project: ProjectDetail, { status = 200, label }: { status?: number; label?: string } = {}) {
  const where = [project.locality, project.city].filter(Boolean).join(", ");
  const progress = stepsProgress(detailSteps(project));
  return personalOk({
    status,
    kind: "project",
    label: label ?? `${project.service ?? "Painting"} project${where ? ` in ${where}` : ""}: ${project.stageLabel}.`,
    data: project,
    meta: { quotations: project.quotations.length, detailSteps: { done: progress.done, total: progress.total } },
    links: { self: `/api/v1/projects/${project.id}`, html: `/account/projects/${project.id}`, projects: "/api/v1/projects" },
  });
}
