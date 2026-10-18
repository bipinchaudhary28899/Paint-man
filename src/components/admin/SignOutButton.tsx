"use client";

import { useState, type FormEvent } from "react";
import { hardNavigate } from "@/lib/browser";

// Signs out with a fetch, then does one full page load of the login page, so the browser
// never renders a stale admin page in between. Without JavaScript the form still posts and
// the server answers with a 303 to the login page.
export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/logout", {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(String(res.status));
      hardNavigate("/admin/login");
    } catch {
      // fall back to the plain form post (server redirects to the login page)
      form.submit();
    }
  }

  return (
    <form action="/api/admin/logout" method="post" onSubmit={onSubmit}>
      <button type="submit" disabled={busy} className="btn-secondary !py-2 text-sm disabled:opacity-60">
        {busy ? "Signing out…" : "Sign out"}
      </button>
    </form>
  );
}
