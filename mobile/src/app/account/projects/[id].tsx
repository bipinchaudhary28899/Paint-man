import { useLocalSearchParams } from "expo-router";

import { ProjectTracker } from "~/components/account/Tracker";
import { Page } from "~/components/site/Page";

export { ScreenError as ErrorBoundary } from "~/components/content/NotFound";

// The website's /account/projects/[id]: one project's tracker. Signed out, it opens the login screen,
// which comes back here; another customer's project (or a bad id) shows "Project not found".
export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  return (
    <Page>
      <ProjectTracker id={(Array.isArray(id) ? id[0] : id) ?? ""} />
    </Page>
  );
}
