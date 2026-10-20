import Image from "next/image";
import { illustrations } from "@/config/images";
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
      <Image
        src={illustrations.toolbox.src}
        alt={illustrations.toolbox.alt}
        width={illustrations.toolbox.width}
        height={illustrations.toolbox.height}
        sizes="240px"
        loading="eager"
        className="mx-auto h-auto w-60"
      />
      <ThankYouMessage />
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="btn-secondary text-brand-700">Back to home</Link>
        <Link href="/services" className="btn-primary">Explore services</Link>
      </div>
    </div>
  );
}
