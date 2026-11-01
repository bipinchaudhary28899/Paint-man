import { AdminProjects } from "~/components/admin/AdminProjects";
import { Page } from "~/components/site/Page";

export { ScreenError as ErrorBoundary } from "~/components/content/NotFound";

// The website's /admin/projects: every project, most recently updated first.
export default function AdminProjectsScreen() {
  return (
    <Page footer={false}>
      <AdminProjects />
    </Page>
  );
}
