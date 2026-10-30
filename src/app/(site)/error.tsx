"use client"; // error boundaries must be Client Components

import { useEffect } from "react";
import { ErrorNotice } from "@/components/ErrorNotice";

// A page that throws while rendering shows this inside the site layout, so the header, footer and
// mobile bar stay and the visitor can carry on. `retry` re-renders the page (Next 16's prop).
export default function SiteError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // the digest (server errors) matches the entry in the server logs; no personal data is in it
    console.error(error);
  }, [error]);
  return <ErrorNotice retry={retry} />;
}
