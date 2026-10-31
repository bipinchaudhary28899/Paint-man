import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ProjectFilters, ProjectList, ProjectPages, type ProjectFilterValues } from "@/components/admin/ProjectList";
import { cities } from "@/config/site";
import { requireAdmin } from "@/lib/auth/server";
import { leadLoadErrorMessage } from "@/lib/leads/load-error";
import { listProjects, type AdminProjectSummary } from "@/lib/projects/repo";
import { isProjectStage } from "@/lib/projects/stages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { absolute: "Projects · Admin" } };

const PAGE_SIZE = 50;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

export default async function AdminProjectsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireAdmin();
  const params = await searchParams;

  // only known stages and cities filter; anything else is ignored rather than matching nothing
  const rawStage = one(params.stage);
  const stage = isProjectStage(rawStage) ? rawStage : undefined;
  const city = one(params.city);
  const values: ProjectFilterValues = {
    stage,
    city: cities.some((c) => c.slug === city) ? city : undefined,
    q: one(params.q).slice(0, 80) || undefined,
  };
  const page = Math.min(Math.max(Number.parseInt(one(params.page), 10) || 1, 1), 10_000);

  let items: AdminProjectSummary[] = [];
  let total = 0;
  let loadError = "";
  try {
    ({ items, total } = await listProjects({ stage, city: values.city, q: values.q, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }));
  } catch (err) {
    console.error("Failed to read projects:", err instanceof Error ? err.name : "unknown error");
    loadError = leadLoadErrorMessage(err).replace("Couldn't load leads", "Couldn't load projects");
  }

  return (
    <div className="container-page py-8">
      <AdminHeader title="Projects" user={session.sub} current="projects">
        <a href="/admin/projects" className="font-semibold text-ink underline">
          Refresh
        </a>
      </AdminHeader>
      {loadError ? (
        <div role="alert" className="mt-8 rounded-2xl border border-line bg-peach-wash p-5">
          <p className="font-display text-lg font-bold">Couldn&apos;t load projects</p>
          <p className="mt-1">{loadError}</p>
          <a href="/admin/projects" className="btn-secondary mt-4 !min-h-11 text-sm">
            Try again
          </a>
        </div>
      ) : (
        <>
          <ProjectFilters values={values} cities={cities.map((c) => ({ slug: c.slug, name: c.name }))} shown={items.length} total={total} />
          <ProjectList items={items} filtered={Boolean(values.stage || values.city || values.q)} />
          <ProjectPages values={values} page={page} pages={Math.ceil(total / PAGE_SIZE)} />
        </>
      )}
    </div>
  );
}
