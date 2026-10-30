// Where the app reaches the website. Production by default; set EXPO_PUBLIC_API_BASE (for example
// http://localhost:3000, the website's `npm run dev`) to work against a local copy. The iOS
// Simulator reaches the Mac's localhost directly.

export const DEFAULT_API_BASE = "https://paintsaathi.in";

/** The base URL without a trailing slash. */
export function apiBase(value: string | undefined = process.env.EXPO_PUBLIC_API_BASE): string {
  return (value?.trim() || DEFAULT_API_BASE).replace(/\/+$/, "");
}

/** A full URL on the website, for pages the app links to (privacy policy, a city's waitlist). */
export const webUrl = (path: string) => `${apiBase()}${path.startsWith("/") ? path : `/${path}`}`;
