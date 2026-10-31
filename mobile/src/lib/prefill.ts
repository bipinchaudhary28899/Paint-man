import { useEffect, useState } from "react";

import { getPalette, services, shadeDisplayName, type PaletteShade } from "~/shared";
import { apiGet } from "./api";
import type { PaintShade } from "./colours";

// The booking page's prefill, as the website's BookPrefill and useBrandShade do it: /book?service=
// (a service page's slug), ?palette= (a palette's slug) or ?shade= (a brand shade id such as
// "asian-paints:8386", looked up through the public colour API). In the app these arrive as route
// params, from the app's own links or a deep link, so only known slugs and well-formed ids are used.

type Param = string | string[] | undefined | null;

/** The query the booking page reads. */
export type BookQuery = { service?: Param; palette?: Param; shade?: Param };

/** The fields of an /api/v1/colours/paint item the prefill uses. */
export type BrandShadeSummary = Pick<PaintShade, "id" | "brand" | "brandName" | "code" | "name" | "hex">;

/** A route param as one trimmed string ("" when absent); a repeated param counts once, as URLSearchParams.get does. */
const first = (p: Param) => (Array.isArray(p) ? p[0] : p)?.trim() ?? "";

/** Service page slug → the form's service choice, from the website's services. */
const serviceBySlug = new Map<string, string>(services.map((s) => [s.slug, s.leadService]));

/** "Asian Paints 8386 Pepper Leaf": brand, shade-card code and name, as the inspector reads a card. */
const shadeLabel = (s: Pick<PaletteShade, "brandName" | "code" | "name">) => `${s.brandName} ${s.code} ${s.name}`;

/** The palette a query names, if it is a real one. */
export const queryPalette = (query: BookQuery) => {
  const slug = first(query.palette);
  return slug ? getPalette(slug) : undefined;
};

/** The service and note the booking form starts with. A palette wins over a shade; a brand shade counts once it has been looked up. */
export function bookPrefill(query: BookQuery, brandShade?: BrandShadeSummary): { defaultService?: string; defaultMessage?: string } {
  const palette = queryPalette(query);
  const defaultMessage = palette
    ? `Interested in the "${palette.name}" palette (${palette.shades.map((s) => shadeLabel({ ...s, name: shadeDisplayName(s.name) })).join(", ")}). Please bring the shade cards.`
    : brandShade
      ? `Interested in ${shadeLabel(brandShade)} (${brandShade.hex.toUpperCase()}). Please bring the shade card.`
      : undefined;
  const slug = first(query.service);
  const defaultService = serviceBySlug.get(slug);
  return { defaultService, defaultMessage };
}

/** The shade id to look up: only when no real palette is chosen (the palette wins). */
export const shadeToLookUp = (query: BookQuery): string | null => (queryPalette(query) ? null : first(query.shade) || null);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Splits `brand-slug:code`; null when the value cannot be a brand shade id. */
export function parseShadeId(id: string): { brand: string; code: string } | null {
  if (id.length > 80) return null;
  const at = id.indexOf(":");
  if (at < 1) return null;
  const brand = id.slice(0, at);
  const code = id.slice(at + 1).trim();
  if (!/^[a-z0-9-]{1,40}$/.test(brand) || !norm(code)) return null;
  return { brand, code };
}

/**
 * The catalogue search that returns this shade first. The search reads a six-character code such as
 * Dunn-Edwards "DE5460" as a hex colour, so a full stop is added (codes are compared without
 * punctuation, so it still matches); a few results are asked for, as codes can differ only by
 * punctuation ("7-1" and "71"), and the exact id is picked from them.
 */
export function brandShadeQuery(id: string): { q: string; brand: string; perPage: number } | null {
  const parsed = parseShadeId(id);
  if (!parsed) return null;
  const q = /^#?[0-9a-f]{6}$/i.test(parsed.code) ? `${parsed.code}.` : parsed.code;
  return { q, brand: parsed.brand, perPage: 5 };
}

/** The exact shade: the same id, else the same brand and code ignoring spaces, case and punctuation. */
export function pickShade(id: string, items: readonly BrandShadeSummary[]): BrandShadeSummary | undefined {
  const parsed = parseShadeId(id);
  if (!parsed) return undefined;
  return items.find((s) => s.id === id) ?? items.find((s) => s.brand === parsed.brand && norm(s.code) === norm(parsed.code));
}

/** Looks one brand shade up through GET /api/v1/colours/paint; undefined for a bad id or when it is not found. */
export async function fetchBrandShade(id: string, signal?: AbortSignal): Promise<BrandShadeSummary | undefined> {
  const query = brandShadeQuery(id);
  if (!query) return undefined;
  const res = await apiGet<BrandShadeSummary[]>("/api/v1/colours/paint", query, { signal });
  return Array.isArray(res.data) ? pickShade(id, res.data) : undefined;
}

/** The brand shade for `id`, once the API has answered; undefined while loading, for a bad id, offline or on any error. */
export function useBrandShade(id: string | null | undefined): BrandShadeSummary | undefined {
  const [found, setFound] = useState<{ id: string; shade: BrandShadeSummary } | null>(null);
  useEffect(() => {
    if (!id || !brandShadeQuery(id)) return;
    const ctl = new AbortController();
    fetchBrandShade(id, ctl.signal)
      .then((shade) => {
        if (shade && !ctl.signal.aborted) setFound({ id, shade });
      })
      .catch(() => {
        // offline, aborted or a bad response: the form keeps its defaults
      });
    return () => ctl.abort();
  }, [id]);
  return found && found.id === id ? found.shade : undefined;
}
