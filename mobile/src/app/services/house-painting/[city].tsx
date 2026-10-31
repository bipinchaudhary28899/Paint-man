import { useLocalSearchParams } from "expo-router";

import { Page } from "~/components/site/Page";
import { NotFound } from "~/components/services/bits";
import { CityPage } from "~/components/services/CityPage";
import { getCity } from "~/shared";

// /services/house-painting/<city>: a live city's main page, or the waitlist for a city coming soon
// (src/app/(site)/services/house-painting/[city]/page.tsx); an unknown city is the website's 404.
export default function HousePaintingInACityScreen() {
  const { city: slug } = useLocalSearchParams<{ city: string }>();
  const city = getCity(slug);
  return <Page>{city ? <CityPage city={city} /> : <NotFound />}</Page>;
}
