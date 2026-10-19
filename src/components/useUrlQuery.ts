import { useLayoutEffect, useMemo, useRef, useState } from "react";

// The page's query string (?service=, ?shade=, ?brand= ...), read in the browser so the page
// that uses it can stay static.
//
// next/navigation's useSearchParams cannot do this on a prerendered page: it makes the nearest
// <Suspense> boundary a client-side-render bailout, so on hydration React throws away the
// server HTML inside it (the booking form, the shade finder) and mounts a fresh
// tree, losing anything typed before hydration. This hook instead renders with an empty query on
// the server and while hydrating, so the server HTML hydrates in place, then reads the address
// bar once the tree is committed and re-renders with the real query.
//
// The address bar is read in a layout effect, never while rendering: during a client-side
// navigation Next.js renders the new page first and writes the new URL as that render commits,
// so a read during render would see the previous page's query. Layout effects run after the URL
// is written, before the browser paints and before any passive effect (such as a component
// rewriting the URL) can change it.

/** The browser's Navigation API, where it exists: it reports same-document navigations (a link to the same page with another query) that fire no popstate. */
function navigationApi(): EventTarget | undefined {
  return "navigation" in window ? (window as unknown as { navigation?: EventTarget }).navigation : undefined;
}

export type UrlQueryOptions = {
  /**
   * Read the query once, when the component mounts, and ignore later changes. For a component
   * that keeps the URL in step with its own state (the colour finder), where the first query is
   * where it starts and every later one is its own doing.
   */
  once?: boolean;
};

/**
 * The current query as URLSearchParams: empty on the server and during hydration, then the
 * address bar's query. Follows back/forward and same-page navigations unless `once` is set. The
 * object is memoised, so it changes identity only when the query string changes.
 */
export function useUrlQuery({ once = false }: UrlQueryOptions = {}): URLSearchParams {
  const [search, setSearch] = useState("");
  const done = useRef(false);
  useLayoutEffect(() => {
    // Strict Mode and a page kept in Next.js's back/forward cache run effects again; a
    // once-reader keeps its first answer.
    if (once && done.current) return;
    done.current = true;
    setSearch(window.location.search);
    if (once) return;
    // Only this page's own query changes count: a navigation to another path means this
    // component is about to unmount, so it must not re-render with that page's query.
    const path = window.location.pathname;
    const sync = () => {
      if (window.location.pathname === path) setSearch(window.location.search);
    };
    // Chrome fires currententrychange synchronously inside history.pushState, which Next.js
    // calls from an insertion effect; updating state there is an error, so wait a microtask.
    const syncSoon = () => queueMicrotask(sync);
    const nav = navigationApi();
    window.addEventListener("popstate", sync);
    nav?.addEventListener("currententrychange", syncSoon);
    return () => {
      window.removeEventListener("popstate", sync);
      nav?.removeEventListener("currententrychange", syncSoon);
    };
  }, [once]);
  return useMemo(() => new URLSearchParams(search), [search]);
}
