import { useLocalSearchParams } from "expo-router";

import { ThankYou, thankYouType, wasSent } from "~/components/content/ThankYou";
import { Page } from "~/components/site/Page";

export { ScreenError as ErrorBoundary } from "~/components/content/NotFound";

// The website's /thank-you (src/app/(site)/thank-you/page.tsx). ?type= picks the wording as on the
// website; ?sent=1 means the form really went. The app's forms are stubbed and come with sent=0, and
// then the page says nothing was sent and points to the website (see ThankYou).
export default function ThankYouScreen() {
  const { type, sent } = useLocalSearchParams<{ type?: string; sent?: string }>();
  return (
    <Page>
      <ThankYou type={thankYouType(type)} sent={wasSent(sent)} />
    </Page>
  );
}
