import { apiError, publicCache } from "@/lib/api";

// /api/v1/colours and /api/v1/colours/{code} served Paint Man's own shade codes (PM-xxx). Those
// were retired for the brands' own shade cards, so both endpoints now answer 410 Gone in the
// error envelope with where to go instead. The answer never changes, so it is cached publicly.

/** Where the retired endpoints' clients should go instead. */
export const shadeApiSuccessors = {
  search: "/api/v1/colours/paint",
  brands: "/api/v1/colours/brands",
  html: "/colours",
} as const;

/** The 410 both retired shade endpoints answer with. */
export function retiredShadeApi() {
  return apiError(
    410,
    "gone",
    `Paint Man's own shade codes (PM-xxx) were retired. Search brand paint shades (Asian Paints, Berger, Nerolac and more) at ${shadeApiSuccessors.search}; the brands are listed at ${shadeApiSuccessors.brands}.`,
    shadeApiSuccessors,
    publicCache,
  );
}
