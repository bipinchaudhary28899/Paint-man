import { LeadsTable } from "@/components/admin/LeadsTable";
import { Logo } from "@/components/Logo";
import { requireAdmin } from "@/lib/auth/server";
import { leadLoadErrorMessage } from "@/lib/leads/load-error";
import { readLeads, type LeadRecord } from "@/lib/leads/store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdmin();

  let leads: LeadRecord[] = [];
  let loadError = "";
  try {
    leads = await readLeads();
  } catch (err) {
    console.error("Failed to read leads:", err instanceof Error ? `${err.name}: ${err.message.slice(0, 200)}` : "unknown error");
    loadError = leadLoadErrorMessage(err);
  }

  return (
    <div className="container-page py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-center gap-2.5">
          <Logo />
          <div>
            <p className="font-display text-xl font-normal">Leads</p>
            <p className="text-xs text-muted">Signed in as {session.sub}</p>
          </div>
        </div>
        <form action="/api/admin/logout" method="post">
          <button type="submit" className="btn-secondary !py-2 text-sm">Sign out</button>
        </form>
      </header>
      {loadError ? (
        <div role="alert" className="mt-8 rounded-2xl border border-line bg-peach-wash p-5">
          <p className="font-display text-lg font-bold">Couldn&apos;t load leads</p>
          <p className="mt-1">{loadError}</p>
        </div>
      ) : (
        <LeadsTable leads={leads} />
      )}
    </div>
  );
}
