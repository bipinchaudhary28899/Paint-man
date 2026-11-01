import { useLocalSearchParams } from "expo-router";

import { projectParam, ThankYou, thankYouType, wasSent } from "~/components/content/ThankYou";
import { Page } from "~/components/site/Page";

export { ScreenError as ErrorBoundary } from "~/components/content/NotFound";

// The website's /thank-you (src/app/(site)/thank-you/page.tsx). ?type= picks the wording as on the
// website; ?sent=1 means the form really went (a booking, with ?project= for "Add your address" when
// it went into the account; a message). Without it the page says nothing was sent and points to the
// website (see ThankYou).
export default function ThankYouScreen() {
  const { type, sent, project } = useLocalSearchParams<{ type?: string; sent?: string; project?: string }>();
  return (
    <Page>
      <ThankYou type={thankYouType(type)} sent={wasSent(sent)} project={projectParam(project)} />
    </Page>
  );
}
