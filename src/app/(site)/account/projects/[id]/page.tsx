import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ProjectView } from "@/components/account/AccountView";
import { site } from "@/config/site";
import { loginHref } from "@/lib/account";
import { getSignedInUser } from "@/lib/auth/user-session";
import { getProjectForUser } from "@/lib/projects/repo";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return pageMetadata({
    title: "Your painting project",
    description: `Track your ${site.name} painting project: each stage with its date, the inspection, your itemised quotation with its PDF and updates from our team.`,
    path: `/account/projects/${id}`,
    noindex: true,
  });
}

// Dynamic (it reads the session cookie): the tracker for one of the signed-in customer's projects.
// Without a session, the login page, coming back here; someone else's project or an unknown id is
// the site's 404 (it never says whether the project exists).
export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  const user = await getSignedInUser();
  if (!user) redirect(loginHref(`/account/projects/${encodeURIComponent(id)}`));
  const project = await getProjectForUser(user.id, id);
  if (!project) notFound();
  return <ProjectView project={project} />;
}
