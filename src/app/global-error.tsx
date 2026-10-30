"use client"; // error boundaries must be Client Components

import { useEffect } from "react";
import { ErrorNotice } from "@/components/ErrorNotice";
import { site } from "@/config/site";
import "./globals.css";

// The last resort, when the root layout itself fails: it replaces the whole document, so it brings
// its own <html>, <body> and the site's stylesheet (the fonts fall back to the stack in globals.css).
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="en-IN">
      <body className="font-sans antialiased">
        <title>{`Something went wrong | ${site.name}`}</title>
        <main id="main">
          <ErrorNotice retry={retry} />
        </main>
      </body>
    </html>
  );
}
