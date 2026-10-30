// Dates of the last real content change, used for <lastmod> in the sitemap. Google only trusts
// lastmod when it is consistently accurate, so these are hand-kept dates, never the build time
// (every deploy would otherwise claim every page changed). Bump SITE_UPDATED, or a section's own
// date, in the same commit as the copy change. ISO dates, YYYY-MM-DD.

/** Last site-wide content change (copy, services, the colour finder and palettes). */
export const SITE_UPDATED = "2026-10-29";

/**
 * Sections that change on their own schedule. A key covers that path and everything below it
 * ("/services" also covers "/services/interior-painting"); "/" covers only the home page. The most
 * specific key wins. Anything not listed uses SITE_UPDATED.
 */
export const sectionUpdated: Record<string, string> = {
  "/": "2026-10-31",
  "/privacy-policy": "2026-10-26",
  "/terms": "2026-10-19",
};

/** The content date for a site path: the most specific section date, else SITE_UPDATED. */
export function contentUpdated(path: string, sections: Record<string, string> = sectionUpdated): string {
  let best = "";
  for (const key of Object.keys(sections)) {
    const covers = key === "/" ? path === "/" : path === key || path.startsWith(`${key}/`);
    if (covers && key.length > best.length) best = key;
  }
  return best ? sections[best] : SITE_UPDATED;
}
