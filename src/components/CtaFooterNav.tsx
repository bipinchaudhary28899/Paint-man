"use client";

import { useEffect, useRef } from "react";

// Same edge as Tailwind's `tab` breakpoint (45.0625rem = 721px), written as the complement of
// min-width so every browser that has matchMedia understands it.
export const PHONE_QUERY = "not all and (min-width: 45.0625rem)";

// The footer's link columns are <details> rendered open on the server, so tablets and desktops show
// every link in any browser (and phones without JS simply show them open). On phones this closes
// them into tap rows once the page is interactive, and re-opens them if the screen grows past 721px
// (rotation, resize). The footer is below the fold, so collapsing it shifts nothing on screen.
export function CtaFooterNav({ children, ...props }: React.ComponentProps<"nav">) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = ref.current;
    if (!nav || typeof window.matchMedia !== "function") return;
    const phone = window.matchMedia(PHONE_QUERY);
    const sync = () => {
      for (const row of nav.querySelectorAll("details")) row.open = !phone.matches;
    };
    sync();
    phone.addEventListener("change", sync);
    return () => phone.removeEventListener("change", sync);
  }, []);
  return (
    <nav ref={ref} {...props}>
      {children}
    </nav>
  );
}
