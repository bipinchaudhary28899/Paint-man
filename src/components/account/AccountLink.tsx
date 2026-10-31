"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ACCOUNT_PATH, hasSignedInHint, LOGIN_PATH, loginHref } from "@/lib/account";

// "Log in" or "My account", chosen in the browser from the readable `ps_signed_in` hint cookie, so
// every static page stays static and no request is made to find out. The server HTML (and the first
// render while hydrating) says "Log in"; a signed-in visitor sees "My account" as soon as the page is
// interactive. The link keeps one fixed width either way, so the swap moves nothing.

const subscribe = (onChange: () => void) => {
  // signing in or out in another tab changes the cookie: read it again when this tab is back in view
  window.addEventListener("focus", onChange);
  window.addEventListener("pageshow", onChange);
  return () => {
    window.removeEventListener("focus", onChange);
    window.removeEventListener("pageshow", onChange);
  };
};
const readHint = () => hasSignedInHint(document.cookie);
const serverHint = () => false;

/** True when the browser holds the sign-in hint (false on the server and while hydrating). */
export function useSignedInHint(): boolean {
  // re-read on every navigation too: the login and logout flows change the cookie
  usePathname();
  return useSyncExternalStore(subscribe, readHint, serverHint);
}

export function AccountLink({ className = "" }: { className?: string }) {
  const signedIn = useSignedInHint();
  const pathname = usePathname() ?? "";
  const here = signedIn ? pathname.startsWith(ACCOUNT_PATH) : pathname === LOGIN_PATH;
  return (
    <Link href={signedIn ? ACCOUNT_PATH : LOGIN_PATH} prefetch={false} aria-current={here ? "page" : undefined} className={className}>
      {signedIn ? "My account" : "Log in"}
    </Link>
  );
}

/**
 * After a booking (the thank-you page): follow it in the account. Signed in, the booking is already
 * linked there; otherwise logging in with the same mobile number links it.
 */
export function TrackBookingInvite() {
  const signedIn = useSignedInHint();
  return (
    <section aria-labelledby="track-booking" className="mx-auto mt-6 max-w-md rounded-[20px] border border-line-soft bg-sand/45 p-5 text-left tab:p-6">
      <h2 id="track-booking" className="text-2xl">
        Track it <em>online</em>
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        {signedIn
          ? "This booking is in your account: follow the inspection, the itemised quotation and the work there, step by step."
          : "Log in with the same mobile number to follow this booking: the inspection, the itemised quotation and the work, step by step."}
      </p>
      <Link href={signedIn ? ACCOUNT_PATH : loginHref(ACCOUNT_PATH)} prefetch={false} className="btn-primary mt-4 w-full tab:w-auto">
        {signedIn ? "Go to my account" : "Log in to track it"}
      </Link>
    </section>
  );
}
