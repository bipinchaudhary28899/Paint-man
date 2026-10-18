import { Emoji } from "@/components/Emoji";
import Link from "next/link";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Thank you",
  description: "We've received your request.",
  path: "/thank-you",
  noindex: true,
});

export default async function ThankYouPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const booking = type !== "contact";
  return (
    <div className="container-page max-w-2xl py-20 text-center">
      <Emoji name="party-popper" size={120} className="mx-auto animate-wiggle" />
      <h1 className="mt-6 text-3xl font-normal text-brand-900">
        {booking ? "Your inspection request is in" : "Thanks for your message"}
      </h1>
      <p className="mt-4 text-lg text-muted">
        {booking
          ? "Our team will call you shortly to confirm a time for the site visit."
          : "We'll get back to you as soon as possible."}{" "}
        Hours: {site.hoursDisplay}.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="btn-secondary text-brand-700">Back to home</Link>
        <Link href="/services" className="btn-primary">Explore services</Link>
      </div>
    </div>
  );
}
