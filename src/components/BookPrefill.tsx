"use client";

import { useSearchParams } from "next/navigation";
import { getPalette } from "@/config/palettes";
import { getColour } from "@/lib/colours/search";
import type { serviceTypes } from "@/lib/leads/options";
import { LeadForm } from "./LeadForm";
import { useBrandShade, type BrandShadeSummary } from "./useBrandShade";

// The booking form with the choice the visitor came from filled in: ?service= (a service page),
// ?palette= (the palettes page), ?colour= (a Paint Man shade) or ?shade= (a brand shade from the
// colour finder). It reads the query in the browser so /book stays a static page; the page renders
// the plain form as this component's Suspense fallback, so the form is in the HTML either way.

type ServiceType = (typeof serviceTypes)[number];

const serviceBySlug = new Map<string, ServiceType>([
  ["interior-painting", "Interior Painting"],
  ["exterior-painting", "Exterior Painting"],
  ["rental-property-painting", "Rental Property"],
]);

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
  return { defaultService: query.service ? serviceBySlug.get(query.service) : undefined, defaultMessage };
}

export function BookPrefill() {
  const params = useSearchParams();
  const query: BookQuery = { service: params.get("service"), colour: params.get("colour"), palette: params.get("palette"), shade: params.get("shade") };
  const ownChoice = Boolean((query.palette && getPalette(query.palette)) || (query.colour && getColour(query.colour)));
  // a brand shade is only looked up when no palette or Paint Man shade is chosen
  const brandShade = useBrandShade(ownChoice ? null : query.shade);
  const { defaultService, defaultMessage } = bookPrefill(query, brandShade);
  // The form's fields are uncontrolled, so a prefill that arrives later (a brand shade) remounts it.
  return <LeadForm key={`${defaultService ?? ""}|${defaultMessage ?? ""}`} type="booking" defaultService={defaultService} defaultMessage={defaultMessage} />;
}
