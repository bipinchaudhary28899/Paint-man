// Browser-only helpers, kept in one module so tests can replace them.

/**
 * A full page load (not a client-side router transition). Used after signing in or out:
 * the session cookie has just changed, and a fresh server render is the only state that is
 * guaranteed to match it. Client transitions here could race (a `replace` plus a `refresh`
 * aborting each other) and leave the admin area blank on slow connections.
 */
export function hardNavigate(url: string) {
  window.location.assign(url);
}
