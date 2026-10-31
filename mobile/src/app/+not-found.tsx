import { NotFoundContent } from "~/components/content/NotFound";
import { Page } from "~/components/site/Page";

// The website's 404 (src/app/not-found.tsx): any path the app has no screen for lands here, inside the
// header and footer, with the pages a lost visitor most likely wants.
export default function NotFoundScreen() {
  return (
    <Page>
      <NotFoundContent />
    </Page>
  );
}
