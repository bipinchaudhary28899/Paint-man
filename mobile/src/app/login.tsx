import { useLocalSearchParams } from "expo-router";

import { Login } from "~/components/account/Login";
import { Page } from "~/components/site/Page";
import { safeNext } from "~/lib/auth";

export { ScreenError as ErrorBoundary } from "~/components/content/NotFound";

// The website's /login: the mobile number, then the 6-digit code from the SMS. ?next= is the app
// screen to open afterwards (checked: only the app's own screens); ?resume=booking means a booking is
// waiting to be sent, so signing in goes back to it.
export default function LoginScreen() {
  const { next, resume } = useLocalSearchParams<{ next?: string; resume?: string }>();
  return (
    <Page>
      <Login next={safeNext(next)} resume={resume === "booking"} />
    </Page>
  );
}
