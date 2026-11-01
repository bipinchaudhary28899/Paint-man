import { useLocalSearchParams } from "expo-router";

import { AdminProject } from "~/components/admin/AdminProject";
import { Page } from "~/components/site/Page";

export { ScreenError as ErrorBoundary } from "~/components/content/NotFound";

// The website's /admin/projects/{id}: one project, its stage, inspection, quotations and timeline.
export default function AdminProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Page footer={false}>
      <AdminProject id={String(id)} />
    </Page>
  );
}
