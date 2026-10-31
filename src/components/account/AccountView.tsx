import Link from "next/link";
import { formatDate, formatMobile, placeLine } from "@/lib/account";
import type { PublicUser } from "@/lib/auth/users";
import type { ProjectDetail, ProjectSummary } from "@/lib/projects/repo";
import { DeleteAccount, NameForm, SignOutButton } from "./AccountActions";
import { ProjectCard, ProjectsEmpty, StagePill } from "./ProjectCard";
import { ProjectTracker } from "./ProjectTracker";

// The bodies of /account and /account/projects/[id]. The pages check the session and load the data;
// these lay it out, so the layout is testable on its own.

const h1 = "mt-3 text-[clamp(34px,5vw,60px)] leading-[1.05] tracking-[-0.02em]";

/** /account: the greeting, "My projects", the customer's details, logging out and deleting the account. */
export function AccountView({ user, projects }: { user: PublicUser; projects: ProjectSummary[] }) {
  const firstName = user.name?.trim().split(/\s+/)[0];
  return (
    <div className="container-page py-10 tab:py-14">
      <p className="eyebrow">My account</p>
      <h1 className={h1}>
        {firstName ? (
          <>
            Namaste, <em>{firstName}</em>
          </>
        ) : (
          <>
            Welcome to your <em>account</em>
          </>
        )}
      </h1>
      <p className="mt-3 max-w-2xl text-lg leading-[1.6] text-muted">Follow each painting project from our call to the handover, see your itemised quotations and keep your details up to date.</p>

      <div className="mt-10 grid gap-10 desk:grid-cols-[minmax(0,1fr)_360px] desk:items-start desk:gap-12">
        <section aria-labelledby="my-projects">
          <h2 id="my-projects" className="text-[28px] leading-tight tab:text-3xl">
            My <em>projects</em>
          </h2>
          {projects.length > 0 ? (
            <ul className="mt-5 grid gap-4">
              {projects.map((p) => (
                <li key={p.id}>
                  <ProjectCard project={p} />
                </li>
              ))}
            </ul>
          ) : (
            <ProjectsEmpty />
          )}
        </section>

        <div className="space-y-6">
          <section aria-labelledby="my-details" className="card space-y-5 p-5 tab:p-7">
            <h2 id="my-details" className="text-[28px] leading-tight">
              Your <em>details</em>
            </h2>
            <NameForm initialName={user.name} />
            <div>
              <p className="text-sm font-semibold text-muted">Mobile number</p>
              <p className="text-lg font-semibold">{formatMobile(user.phone)}</p>
              <p className="mt-0.5 text-sm text-muted">You log in with this number. Account since {formatDate(user.createdAt)}.</p>
            </div>
            <SignOutButton />
          </section>
          <section aria-labelledby="delete-account" className="rounded-pm-lg border border-line p-5 tab:p-7">
            <h2 id="delete-account" className="text-2xl leading-tight">
              Delete your <em>account</em>
            </h2>
            <div className="mt-3">
              <DeleteAccount />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/** /account/projects/[id]: the project's heading (service, place, address, stage) and the tracker. */
export function ProjectView({ project }: { project: ProjectDetail }) {
  const place = project.locality || project.city;
  const address = placeLine(project.address, project.locality, [project.city, project.pincode].filter(Boolean).join(" "));
  return (
    <div className="container-page py-8 tab:py-12">
      <Link href="/account" className="link-arrow min-h-11 text-[15px]">
        <span aria-hidden>←</span> My account
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="eyebrow">
          Booked {formatDate(project.createdAt)} · Ref PS-{project.id.slice(0, 8).toUpperCase()}
        </p>
        <StagePill stage={project.stage} label={project.stageLabel} />
      </div>
      <h1 className={h1}>
        {project.service ?? "House painting"}
        {place ? (
          <>
            {" "}
            in <em>{place}</em>
          </>
        ) : (
          <em> project</em>
        )}
      </h1>
      {address && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted tab:text-base">{address}</p>}
      <ProjectTracker project={project} />
    </div>
  );
}
