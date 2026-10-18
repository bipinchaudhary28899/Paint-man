import { Emoji } from "@/components/Emoji";
import Link from "next/link";
import { Suspense } from "react";
import { ThankYouMessage } from "@/components/ThankYouMessage";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Thank you",
  description: "We've received your request.",
  path: "/thank-you",
  noindex: true,
});

// Static: prerendered and served from the CDN, and prefetched by the forms, so it appears
// immediately after a lead is saved. The booking/contact wording is chosen in the browser.
export default function ThankYouPage() {
  return (
    <div className="container-page max-w-2xl py-20 text-center">
      <Emoji name="party-popper" size={120} className="mx-auto animate-wiggle" />
      <Suspense fallback={<h1 className="mt-6 text-3xl font-normal text-brand-900">Thank you</h1>}>
        <ThankYouMessage />
      </Suspense>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="btn-secondary text-brand-700">Back to home</Link>
        <Link href="/services" className="btn-primary">Explore services</Link>
      </div>
    </div>
  );
}
