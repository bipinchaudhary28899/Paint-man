import { useLocalSearchParams } from "expo-router";

import { Page } from "~/components/site/Page";
import { NotFound } from "~/components/services/bits";
import { findServiceCity, ServiceCity } from "~/components/services/ServiceCity";

// /services/<service>/<city>: a service in one city (src/app/(site)/services/[slug]/[city]/page.tsx);
// a service with no local copy for the city is the website's 404.
export default function ServiceInACityScreen() {
  const { slug, city } = useLocalSearchParams<{ slug: string; city: string }>();
  const found = findServiceCity(slug, city);
  return <Page>{found ? <ServiceCity {...found} /> : <NotFound />}</Page>;
}
