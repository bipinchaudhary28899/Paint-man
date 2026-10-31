import { redirect } from "next/navigation";
import { AccountView } from "@/components/account/AccountView";
import { site } from "@/config/site";
import { loginHref } from "@/lib/account";
import { getSignedInUser } from "@/lib/auth/user-session";
import { listProjectsForUser } from "@/lib/projects/repo";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "My account",
  description: `Your ${site.name} account: track each painting project from the call to the handover, see itemised quotations and update your details.`,
  path: "/account",
  noindex: true,
});

// Dynamic (it reads the session cookie): the signed-in customer's projects and details. Without a
// session, the login page, coming back here.
export default async function AccountPage() {
  const user = await getSignedInUser();
  if (!user) redirect(loginHref("/account"));
  const projects = await listProjectsForUser(user.id);
  return <AccountView user={user} projects={projects} />;
}
