"use client";

import { getPalette } from "@/config/palettes";
import { getService } from "@/config/site";
import { getColour } from "@/lib/colours/search";
import type { serviceTypes } from "@/lib/leads/options";
import { LeadForm } from "./LeadForm";
import { useBrandShade, type BrandShadeSummary } from "./useBrandShade";
import { useUrlQuery } from "./useUrlQuery";

// The booking form with the choice the visitor came from filled in: ?service= (a service page),
// ?palette= (the palettes page), ?colour= (a Paint Man shade) or ?shade= (a brand shade from the
// colour finder). It reads the query in the browser so /book stays a static page: the server
// HTML is the plain form, which hydrates in place, and only a link that carries a choice
// remounts it with that choice filled in.

type ServiceType = (typeof serviceTypes)[number];

export type BookQuery = { service?: string | null; colour?: string | null; palette?: string | null; shade?: string | null };

/** The service and message to start the form with. A palette wins over a shade; a brand shade is used only once it has been looked up. */
export function bookPrefill(query: BookQuery, brandShade?: BrandShadeSummary): { defaultService?: ServiceType; defaultMessage?: string } {
  const palette = query.palette ? getPalette(query.palette) : undefined;
  const colour = query.colour ? getColour(query.colour) : undefined;
  const defaultMessage = palette
    ? `Interested in the "${palette.name}" palette (${palette.codes.join(", ")}). Please bring the shade cards.`
    : colour
      ? `Interested in the shade ${colour.name} (${colour.code}). Please bring the shade card.`
      : brandShade
        ? `Interested in ${brandShade.brandName} ${brandShade.code} ${brandShade.name} (${brandShade.hex.toUpperCase()}). Please bring the shade card.`
        : undefined;
  // a service page links with its slug; the form's choice for it comes from the service data
  const defaultService = query.service ? getService(query.service)?.leadService : undefined;
  return { defaultService, defaultMessage };
}

export function BookPrefill() {
  const params = useUrlQuery();
  const query: BookQuery = { service: params.get("service"), colour: params.get("colour"), palette: params.get("palette"), shade: params.get("shade") };
  const ownChoice = Boolean((query.palette && getPalette(query.palette)) || (query.colour && getColour(query.colour)));
  // a brand shade is only looked up when no palette or Paint Man shade is chosen
  const brandShade = useBrandShade(ownChoice ? null : query.shade);
  const { defaultService, defaultMessage } = bookPrefill(query, brandShade);
  // The form's fields are uncontrolled, so a prefill remounts it. Without one the key is the
  // same as in the server render, so the hydrated form (and anything typed into it) stays.
  return <LeadForm key={`${defaultService ?? ""}|${defaultMessage ?? ""}`} type="booking" defaultService={defaultService} defaultMessage={defaultMessage} />;
}
