import { useEffect, useState } from "react";

// Resolves a brand paint shade id (`brand-slug:code`, e.g. "asian-paints:7982") in the browser
// through the public catalogue API. The 8,500-shade dataset is server-only, so client pages
// (the booking prefill) look one shade up instead of importing it.

/** The fields of an /api/v1/colours/paint item that the pages use. */
export type BrandShadeSummary = { id: string; brand: string; brandName: string; code: string; name: string; hex: string };

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
 * The catalogue search that returns this shade first. The search reads a six-character code such
 * as Dunn-Edwards "DE5460" as a hex colour, so a full stop is added: codes are compared without
 * punctuation, so it still matches exactly. A few codes differ only by punctuation ("7-1" and
 * "71"), so a handful of results are requested and the exact id is picked from them.
 */
export function brandShadeUrl(id: string): string | null {
  const parsed = parseShadeId(id);
  if (!parsed) return null;
  const q = /^#?[0-9a-f]{6}$/i.test(parsed.code) ? `${parsed.code}.` : parsed.code;
  return `/api/v1/colours/paint?${new URLSearchParams({ q, brand: parsed.brand, perPage: "5" })}`;
}

/** The exact shade: the same id, else the same brand and code ignoring spaces, case and punctuation. */
export function pickShade(id: string, items: BrandShadeSummary[]): BrandShadeSummary | undefined {
  const parsed = parseShadeId(id);
  if (!parsed) return undefined;
  return items.find((s) => s.id === id) ?? items.find((s) => s.brand === parsed.brand && norm(s.code) === norm(parsed.code));
}

/** The brand shade for `id`, once the API has answered; undefined while loading, for a bad id or on any error. */
export function useBrandShade(id: string | null | undefined): BrandShadeSummary | undefined {
  const [found, setFound] = useState<{ id: string; shade: BrandShadeSummary } | null>(null);
  useEffect(() => {
    const url = id ? brandShadeUrl(id) : null;
    if (!id || !url) return;
    const ctl = new AbortController();
    fetch(url, { signal: ctl.signal })
      .then((res) => (res.ok ? (res.json() as Promise<{ data?: BrandShadeSummary[] }>) : null))
      .then((json) => {
        const shade = Array.isArray(json?.data) ? pickShade(id, json.data) : undefined;
        if (shade) setFound({ id, shade });
      })
      .catch(() => {
        // offline, aborted or a bad response: the page keeps its defaults
      });
    return () => ctl.abort();
  }, [id]);
  return found && found.id === id ? found.shade : undefined;
}
