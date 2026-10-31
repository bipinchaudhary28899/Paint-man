import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { InspectionPanel } from "@/components/admin/InspectionPanel";
import { ProjectCustomer } from "@/components/admin/ProjectCustomer";
import { ProjectTimeline } from "@/components/admin/ProjectTimeline";
import { QuotationsPanel } from "@/components/admin/QuotationsPanel";
import { StageControl } from "@/components/admin/StageControl";
import { formatIstDateTime } from "@/lib/admin/ist";
import { requireAdmin } from "@/lib/auth/server";
import { leadLoadErrorMessage } from "@/lib/leads/load-error";
import { formatPaise } from "@/lib/money";
import { getProjectForAdmin, type AdminProject } from "@/lib/projects/repo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { absolute: "Project · Admin" } };

export default async function AdminProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const { id } = await params;

  let project: AdminProject | null = null;
  let loadError = "";
  try {
    project = await getProjectForAdmin(id);
  } catch (err) {
    console.error("Failed to read a project:", err instanceof Error ? err.name : "unknown error");
    loadError = leadLoadErrorMessage(err).replace("Couldn't load leads", "Couldn't load this project");
  }
  if (!project && !loadError) notFound();

  return (
    <div className="container-page py-8">
      <AdminHeader title={project?.name ?? "Project"} user={session.sub} current="projects">
        <a href={`/admin/projects/${id}`} className="font-semibold text-ink underline">
          Refresh
        </a>
      </AdminHeader>
      <p className="mt-4 text-sm">
        <Link href="/admin/projects" className="font-semibold text-muted hover:text-tangerine-text">
          ← All projects
        </Link>
      </p>

      {!project ? (
        <div role="alert" className="mt-6 rounded-2xl border border-line bg-peach-wash p-5">
          <p className="font-display text-lg font-bold">Couldn&apos;t load this project</p>
          <p className="mt-1">{loadError}</p>
          <a href={`/admin/projects/${id}`} className="btn-secondary mt-4 !min-h-11 text-sm">
            Try again
          </a>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">
            {[project.service, [project.locality, project.city].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
            {" · "}Booked {formatIstDateTime(project.createdAt)} · Updated {formatIstDateTime(project.updatedAt)}
            {project.finalPricePaise !== undefined && (
              <>
                {" · "}
                <strong className="text-ink">Final price {formatPaise(project.finalPricePaise)}</strong>
              </>
            )}
          </p>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <ProjectCustomer project={project} />
            <StageControl projectId={project.id} stage={project.stage} stageExplanation={project.stageExplanation} workStartsOn={project.workStartsOn} />
            <InspectionPanel projectId={project.id} inspection={project.inspection} />
            <div className="order-last lg:order-none">
              <ProjectTimeline events={project.timeline} />
            </div>
            <div className="min-w-0 lg:col-span-2">
              <QuotationsPanel projectId={project.id} quotations={project.quotations} pdf />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
