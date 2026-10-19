import { Emoji } from "@/components/Emoji";
import Link from "next/link";
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
      <ThankYouMessage />
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="btn-secondary text-brand-700">Back to home</Link>
        <Link href="/services" className="btn-primary">Explore services</Link>
      </div>
    </div>
  );
}
