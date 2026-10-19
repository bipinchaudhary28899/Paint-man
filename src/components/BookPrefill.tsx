"use client";

import { getPalette, shadeDisplayName, type PaletteShade } from "@/config/palettes";
import type { serviceTypes } from "@/lib/leads/options";
import { LeadForm } from "./LeadForm";
import { useBrandShade, type BrandShadeSummary } from "./useBrandShade";
import { useUrlQuery } from "./useUrlQuery";

// The booking form with the choice the visitor came from filled in: ?service= (a service page),
// ?palette= (the palettes page) or ?shade= (a brand shade from the colour finder or the
// visualizer). It reads the query in the browser so /book stays a static page: the server HTML is
// the plain form, which hydrates in place, and only a link that carries a choice remounts it with
// that choice filled in.

type ServiceType = (typeof serviceTypes)[number];
/** Service page slug -> the form's service choice. Built on the server from src/config/site.ts and
 * passed in, so the service pages' long copy never ships in this client bundle. */
export type ServiceBySlug = Record<string, ServiceType>;

export type BookQuery = { service?: string | null; palette?: string | null; shade?: string | null };

/** "Asian Paints 8386 Pepper Leaf": brand, shade-card code and name, as the inspector reads a card. */
const shadeLabel = (s: Pick<PaletteShade, "brandName" | "code" | "name">) => `${s.brandName} ${s.code} ${s.name}`;

/** The service and message to start the form with. A palette wins over a shade; a brand shade is used only once it has been looked up. */
export function bookPrefill(
  query: BookQuery,
  brandShade?: BrandShadeSummary,
  serviceBySlug: ServiceBySlug = {},
): { defaultService?: ServiceType; defaultMessage?: string } {
  const palette = query.palette ? getPalette(query.palette) : undefined;
  const defaultMessage = palette
    ? `Interested in the "${palette.name}" palette (${palette.shades.map((s) => shadeLabel({ ...s, name: shadeDisplayName(s.name) })).join(", ")}). Please bring the shade cards.`
    : brandShade
      ? `Interested in ${shadeLabel(brandShade)} (${brandShade.hex.toUpperCase()}). Please bring the shade card.`
      : undefined;
  // a service page links with its slug; the form's choice for it comes from the service data
  const defaultService = query.service && Object.hasOwn(serviceBySlug, query.service) ? serviceBySlug[query.service] : undefined;
  return { defaultService, defaultMessage };
}

export function BookPrefill({ serviceBySlug }: { serviceBySlug: ServiceBySlug }) {
  const params = useUrlQuery();
  const query: BookQuery = { service: params.get("service"), palette: params.get("palette"), shade: params.get("shade") };
  // a brand shade is only looked up when no palette is chosen
  const brandShade = useBrandShade(query.palette && getPalette(query.palette) ? null : query.shade);
  const { defaultService, defaultMessage } = bookPrefill(query, brandShade, serviceBySlug);
  // The form's fields are uncontrolled, so a prefill remounts it. Without one the key is the
  // same as in the server render, so the hydrated form (and anything typed into it) stays.
  return <LeadForm key={`${defaultService ?? ""}|${defaultMessage ?? ""}`} type="booking" defaultService={defaultService} defaultMessage={defaultMessage} />;
}
