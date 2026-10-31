import { Page } from "~/components/site/Page";
import { HousePaintingHub } from "~/components/services/HousePainting";

// /services/house-painting: the national house-painting hub (src/app/(site)/services/house-painting/page.tsx).
export default function HousePaintingScreen() {
  return (
    <Page>
      <HousePaintingHub />
    </Page>
  );
}
