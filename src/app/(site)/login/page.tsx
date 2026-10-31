import Link from "next/link";
import { LoginForm } from "@/components/account/LoginForm";
import { customerLoginOpen } from "@/config/login";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Log in to your account",
  description: `Log in to your ${site.name} account with your mobile number and a one-time SMS code to track your painting project and download your quotation.`,
  path: "/login",
  noindex: true,
});

const perks = [
  { title: "Every stage, as it happens", text: "From our call and the site inspection to the painting and the handover." },
  { title: "Your itemised quotation", text: "Each wall, door or grill with its preparation, paint, coats and price, and a PDF to keep." },
  { title: "Updates from our team", text: "Inspection findings, dates and notes in one place." },
];

// Static: the form reads ?next= in the browser (src/components/useUrlQuery.ts) and talks to
// /api/v1/auth/*. Kept out of the index (noindex) and out of the sitemap. While customer login is
// closed (src/config/login.ts) the page says accounts are coming soon and points to booking; the
// tester numbers sign in from a fold-out. Staff always find the administrator login here.
export default function LoginPage() {
  const open = customerLoginOpen();
  return (
    <div className="container-page py-10 tab:py-14 desk:py-20">
      <div className="grid gap-8 desk:grid-cols-[minmax(0,1fr)_440px] desk:items-start desk:gap-x-16 desk:gap-y-10">
        <div className="desk:col-start-1">
          <p className="eyebrow">My account</p>
          <h1 className="mt-3 text-[clamp(36px,5vw,60px)] leading-[1.05] tracking-[-0.02em]">
            {open ? (
              <>
                Log in to track your <em>project</em>
              </>
            ) : (
              <>
                Customer accounts are coming <em>soon</em>
              </>
            )}
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-[1.6] text-muted">
            {open
              ? "Use the mobile number you booked with, and follow your painting project from our call to the handover."
              : "Soon you'll log in with the mobile number you booked with and follow your painting project from our call to the handover. Until then, book a visit and we call you at every step."}
          </p>
        </div>

        <div className="card p-5 tab:p-8 desk:col-start-2 desk:row-span-2 desk:row-start-1">
          {open ? (
            <>
              <LoginForm />
              <p className="mt-5 border-t border-line-soft pt-4 text-sm leading-relaxed text-muted">
                First time here? Your account is made when you log in, and every booking made with your number shows up in it.{" "}
                <Link href="/privacy-policy" className="font-semibold text-ink underline underline-offset-4 hover:text-terracotta">
                  How we handle your number
                </Link>
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-2xl">Booking is open now</p>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                Leave your name, mobile number and area, and we call you back to fix a free site visit.
              </p>
              <Link href="/book" className="btn-primary mt-5 w-full">
                Book a free site visit
              </Link>
              <details className="group mt-5 border-t border-line-soft pt-1">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  Testing for {site.name}? Use a tester number
                  <span aria-hidden className="text-xl leading-none transition-transform group-open:rotate-45 motion-reduce:transition-none">
                    +
                  </span>
                </summary>
                <div className="pt-3">
                  <LoginForm />
                </div>
              </details>
            </>
          )}
          <p className="mt-5 border-t border-line-soft pt-4 text-sm leading-relaxed text-muted">
            {site.name} team?{" "}
            <Link href="/admin/login" rel="nofollow" prefetch={false} className="font-semibold text-ink underline underline-offset-4 hover:text-terracotta">
              Log in as an administrator
            </Link>
          </p>
        </div>

        <ul className="grid gap-4 tab:grid-cols-3 desk:col-start-1 desk:row-start-2 desk:grid-cols-1">
          {perks.map((p) => (
            <li key={p.title} className="border-t border-line pt-4">
              <p className="font-display text-xl">{p.title}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-muted">{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
      {open && (
        <p className="mt-10 text-[15px] text-muted">
          Not booked yet?{" "}
          <Link href="/book" className="link-arrow inline-flex text-[15px] font-semibold">
            Book a free site visit <span aria-hidden>→</span>
          </Link>
        </p>
      )}
    </div>
  );
}
