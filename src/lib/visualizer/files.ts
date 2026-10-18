// Upload rules for the visualizer. Photos never leave the browser, but we still bound what we
// accept so a huge or odd file cannot stall the page.
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_BYTES = 12 * 1024 * 1024;
/** Longest edge the photo is processed at; the model sees 512px anyway and recolouring stays snappy. */
export const MAX_EDGE = 1400;

export function validateImageFile(file: { type: string; size: number; name?: string }): string | null {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) return "Please choose a JPEG, PNG or WebP photo.";
  if (file.size > MAX_BYTES) return "That photo is over 12 MB. Please choose a smaller one.";
  if (file.size === 0) return "That file is empty.";
  return null;
}

/** Size to process a photo at: the same aspect, longest edge capped at MAX_EDGE. */
export function fitWithin(width: number, height: number, maxEdge = MAX_EDGE): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
