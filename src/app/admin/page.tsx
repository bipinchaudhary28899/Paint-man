import { LeadsTable } from "@/components/admin/LeadsTable";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { Logo } from "@/components/Logo";
import { requireAdmin } from "@/lib/auth/server";
import { leadLoadErrorMessage } from "@/lib/leads/load-error";
import { readLeads, type LeadRecord } from "@/lib/leads/store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdmin();

  let leads: LeadRecord[] = [];
  let loadError = "";
  // when this list was read, in India time, so a stale tab is easy to spot
  const loadedAt = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" });
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
            <p className="text-xs text-muted">
              Signed in as {session.sub} · Loaded at {loadedAt} ·{" "}
              {/* a plain link: a fresh page load re-reads the sheet, with or without JavaScript */}
              <a href="/admin" className="font-semibold text-ink underline">Refresh</a>
            </p>
          </div>
        </div>
        <SignOutButton />
      </header>
      {loadError ? (
        <div role="alert" className="mt-8 rounded-2xl border border-line bg-peach-wash p-5">
          <p className="font-display text-lg font-bold">Couldn&apos;t load leads</p>
          <p className="mt-1">{loadError}</p>
          <a href="/admin" className="btn-secondary mt-4 !min-h-11 text-sm">Try again</a>
        </div>
      ) : (
        <LeadsTable leads={leads} />
      )}
    </div>
  );
}
