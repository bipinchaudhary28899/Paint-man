import { router } from "expo-router";
import { Linking } from "react-native";

import { webUrl } from "./config";

// The app's screens sit at the website's own paths (/services/interior-painting/agra, /colours,
// /shade-cards/berger...), so every href in the website's config (nav.ts, FAQ links, weather notes)
// opens the matching screen. A #fragment becomes the `section` param, which the page scrolls to (the
// website's in-page anchors). Paths the app has no screen for (/admin) open on the website.

const ROUTES: RegExp[] = [
  /^\/$/,
  /^\/(about|book|colours|contact|faq|gallery|palettes|privacy-policy|terms|thank-you)$/,
  /^\/services$/,
  /^\/services\/[a-z0-9-]+$/,
  /^\/services\/[a-z0-9-]+\/[a-z0-9-]+$/,
  /^\/shade-cards$/,
  /^\/shade-cards\/[a-z0-9-]+$/,
  /^\/shade-cards\/[a-z0-9-]+\/[a-z0-9-]+$/,
];

export type AppRoute = { pathname: string; params: Record<string, string> };

/** The app screen for a website href, or null when it is external or has no screen in the app. */
export function routeFor(href: string): AppRoute | null {
  if (!href.startsWith("/")) return null;
  const [beforeHash, hash] = href.split("#");
  const [rawPath, query] = beforeHash.split("?");
  const pathname = rawPath.replace(/\/+$/, "") || "/";
  if (!ROUTES.some((r) => r.test(pathname))) return null;
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(query ?? "")) params[k] = v;
  if (hash) params.section = hash;
  return { pathname, params };
}

/** Opens a website href: its screen in the app, or the page in the browser (external links, /admin). */
export function openHref(href: string): void {
  const route = routeFor(href);
  if (route) {
    router.push({ pathname: route.pathname as never, params: route.params });
    return;
  }
  void Linking.openURL(href.startsWith("/") ? webUrl(href) : href);
}
