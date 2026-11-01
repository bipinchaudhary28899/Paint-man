import { AdminLogin } from "~/components/admin/AdminLogin";
import { Page } from "~/components/site/Page";

export { ScreenError as ErrorBoundary } from "~/components/content/NotFound";

// The website's /admin/login: staff sign in with the admin username and password, in the app.
export default function AdminLoginScreen() {
  return (
    <Page footer={false}>
      <AdminLogin />
    </Page>
  );
}
