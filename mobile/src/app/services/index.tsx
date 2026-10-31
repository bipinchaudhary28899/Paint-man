import { Page } from "~/components/site/Page";
import { ServicesIndex } from "~/components/services/ServicesIndex";

// /services: the services as swipeable cards, then each live city with its service pages (src/app/(site)/services/page.tsx).
export default function PaintingServicesScreen() {
  return (
    <Page>
      <ServicesIndex />
    </Page>
  );
}
