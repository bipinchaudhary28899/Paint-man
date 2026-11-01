import { AdminLeads } from "~/components/admin/AdminLeads";
import { Page } from "~/components/site/Page";

export { ScreenError as ErrorBoundary } from "~/components/content/NotFound";

// The website's /admin: the leads. Signed out, it opens the admin sign-in screen.
export default function AdminLeadsScreen() {
  return (
    <Page footer={false}>
      <AdminLeads />
    </Page>
  );
}
