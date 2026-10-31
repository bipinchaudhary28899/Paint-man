import { Account } from "~/components/account/Account";
import { Page } from "~/components/site/Page";

export { ScreenError as ErrorBoundary } from "~/components/content/NotFound";

// The website's /account: the customer's projects and details. Signed out, it opens the login screen,
// which comes back here.
export default function AccountScreen() {
  return (
    <Page>
      <Account />
    </Page>
  );
}
