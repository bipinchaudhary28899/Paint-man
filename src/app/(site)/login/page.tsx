import Link from "next/link";
import { LoginForm } from "@/components/account/LoginForm";
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
// /api/v1/auth/*. Kept out of the index (noindex) and out of the sitemap.
export default function LoginPage() {
  return (
    <div className="container-page py-10 tab:py-14 desk:py-20">
      <div className="grid gap-8 desk:grid-cols-[minmax(0,1fr)_440px] desk:items-start desk:gap-x-16 desk:gap-y-10">
        <div className="desk:col-start-1">
          <p className="eyebrow">My account</p>
          <h1 className="mt-3 text-[clamp(36px,5vw,60px)] leading-[1.05] tracking-[-0.02em]">
            Log in to track your <em>project</em>
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-[1.6] text-muted">
            Use the mobile number you booked with, and follow your painting project from our call to the handover.
          </p>
        </div>

        <div className="card p-5 tab:p-8 desk:col-start-2 desk:row-span-2 desk:row-start-1">
          <LoginForm />
          <p className="mt-5 border-t border-line-soft pt-4 text-sm leading-relaxed text-muted">
            First time here? Your account is made when you log in, and every booking made with your number shows up in it.{" "}
            <Link href="/privacy-policy" className="font-semibold text-ink underline underline-offset-4 hover:text-terracotta">
              How we handle your number
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
      <p className="mt-10 text-[15px] text-muted">
        Not booked yet?{" "}
        <Link href="/book" className="link-arrow inline-flex text-[15px] font-semibold">
          Book a free inspection <span aria-hidden>→</span>
        </Link>
      </p>
    </div>
  );
}
