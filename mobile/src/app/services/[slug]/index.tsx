import { useLocalSearchParams } from "expo-router";

import { Page } from "~/components/site/Page";
import { NotFound } from "~/components/services/bits";
import { ServiceHub } from "~/components/services/ServiceHub";
import { getService } from "~/shared";

// /services/<service>: a service hub (src/app/(site)/services/[slug]/page.tsx); an unknown slug is the website's 404.
export default function ServiceScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const service = getService(slug);
  return <Page>{service ? <ServiceHub service={service} /> : <NotFound />}</Page>;
}
