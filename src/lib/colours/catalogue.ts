// Facts about the brand-shade catalogue that client components may print without loading it
// (src/lib/colours/brands.ts is server-only). tests/backend/colours-brands.test.ts checks them
// against the data, so the copy stays true when `npm run data:paintdb` refreshes it.

/** The number of brand shades, rounded down for copy: "Search 8,500+ brand shades". */
export const BRAND_SHADES_ROUNDED = "8,500+";

/** PaintDB, the source of the brand shades, and its licence: the CC BY 4.0 attribution links. */
export const PAINTDB = { source: "https://paintdb.com", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" } as const;
