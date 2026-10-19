import { apiError, publicCache } from "@/lib/api";
import { legacyShadeCode, LEGACY_SHADE_BRAND } from "@/config/legacy-shades";

// /api/v1/colours and /api/v1/colours/{code} served Paint Man's own shade codes (PM-xxx). Those
// were retired for the brands' own shade cards, so both endpoints now answer 410 Gone in the
// error envelope with where to go instead. The answer never changes, so it carries publicCache;
// note that src/proxy.ts currently sets "no-store" on every /api response, which wins at runtime.

/** Where the retired endpoints' clients should go instead. */
export const shadeApiSuccessors = {
  search: "/api/v1/colours/paint",
  brands: "/api/v1/colours/brands",
  html: "/colours",
} as const;

/** The brand shade a retired Paint Man code now points to (its nearest Asian Paints shade), if it was one. */
export function shadeReplacement(code: string) {
  const mapped = legacyShadeCode(code);
  if (!mapped) return undefined;
  const q = new URLSearchParams({ brand: LEGACY_SHADE_BRAND, q: mapped });
  return { id: `${LEGACY_SHADE_BRAND}:${mapped}`, self: `${shadeApiSuccessors.search}?${q}`, html: `${shadeApiSuccessors.html}?${q}` };
}

/**
 * The 410 both retired shade endpoints answer with. Given an old Paint Man code, error.details also
 * carries `replacement`: the nearest Asian Paints shade, the same one /colours/<code> redirects to.
 */
export function retiredShadeApi(code?: string) {
  const replacement = code === undefined ? undefined : shadeReplacement(code);
  return apiError(
    410,
    "gone",
    `Paint Man's own shade codes (PM-xxx) were retired. Search brand paint shades (Asian Paints, Berger, Nerolac and more) at ${shadeApiSuccessors.search}; the brands are listed at ${shadeApiSuccessors.brands}.${replacement ? ` The nearest shade to this one is ${replacement.id}: ${replacement.self}.` : ""}`,
    replacement ? { ...shadeApiSuccessors, replacement } : shadeApiSuccessors,
    publicCache,
  );
}

/**
 * /api/v1/colours/web served the photo visualizer's named colours (color.pizza). The visualizer
 * was retired (shades are previewed on the finder's room photo), so the endpoint answers 410.
 */
export function retiredWebColoursApi() {
  return apiError(
    410,
    "gone",
    `The named-colour search served the photo visualizer, which was retired. Search brand paint shades (Asian Paints, Berger, Nerolac and more) at ${shadeApiSuccessors.search}; each is previewed on a room at ${shadeApiSuccessors.html}.`,
    shadeApiSuccessors,
    publicCache,
  );
}
