import Link from "next/link";

// What a visitor sees when a page breaks (src/app/(site)/error.tsx inside the site layout, and
// src/app/global-error.tsx if the layout itself fails): a plain apology, a retry that re-renders
// the page, and the two ways forward that matter most, home and booking. No error details: they
// mean nothing to a visitor and may leak internals.
export function ErrorNotice({ retry }: { retry: () => void }) {
  return (
    <div className="container-page max-w-2xl py-24 text-center">
      <h1 className="text-[clamp(36px,5vw,56px)] leading-[1.05] tracking-[-0.02em]">
        Something went <em>wrong.</em>
      </h1>
      <p className="mt-5 text-lg leading-[1.65] text-muted">
        Kuch gadbad ho gayi. This page didn&apos;t load properly. Try again, or carry on from the home page; your booking form is
        always one tap away.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => retry()} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-secondary">
          Go to the home page
        </Link>
        <Link href="/book" className="btn-secondary">
          Book a site visit
        </Link>
      </div>
    </div>
  );
}
