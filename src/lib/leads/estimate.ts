// Rough job sizing from what a customer knows (carpet area and floors), so the team can plan a
// crew before the site visit. Rules of thumb only: the inspector measures on site.

/** Walls + ceilings to paint inside an Indian home are about 3–3.5× its carpet area. */
export const PAINT_AREA_PER_CARPET_SQFT = 3.5;
/** One painter covers about this much a day through putty, primer and two coats. */
export const SQFT_PER_PAINTER_DAY = 100;
/** Crews are planned for jobs of about a week, between these sizes. */
const CREW_MIN = 2, CREW_MAX = 8, TARGET_DAYS = 7;

/** "4+" counts as 4. */
export const floorCount = (floors: string) => Math.max(1, Number.parseInt(floors, 10) || 1);

/**
 * Interior paint area (walls + ceilings, sq ft) for a carpet area per floor, or null when it
 * can't be estimated: no carpet area, or an exterior-only job (measured on site).
 */
export function estimatePaintArea(carpetAreaPerFloor: number | undefined, floors: string, service: string): number | null {
  if (!carpetAreaPerFloor || carpetAreaPerFloor <= 0) return null;
  if (service === "Exterior Painting") return null;
  return Math.round((carpetAreaPerFloor * floorCount(floors) * PAINT_AREA_PER_CARPET_SQFT) / 10) * 10;
}

/** Painter-days for an area, and a suggested crew for a job of about a week. */
export function crewEstimate(paintArea: number) {
  const painterDays = Math.max(1, Math.ceil(paintArea / SQFT_PER_PAINTER_DAY));
  const painters = Math.min(CREW_MAX, Math.max(CREW_MIN, Math.ceil(painterDays / TARGET_DAYS)));
  const days = Math.ceil(painterDays / painters);
  return { painterDays, painters, days };
}

export const formatSqft = (n: number) => `${n.toLocaleString("en-IN")} sq ft`;
