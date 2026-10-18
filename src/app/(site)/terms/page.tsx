import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: `Terms of Service for House Painting in ${site.city}`,
  description: `Terms for booking house painting with ${site.name} in ${site.city}: site inspections, itemised quotations, payment schedules and approved changes in scope.`,
  path: "/terms",
});

// Starter text only. Have it reviewed by a qualified professional before launch.
export default function TermsPage() {
  return (
    <div className="container-page max-w-3xl py-10">
      <Breadcrumbs items={[{ name: "Terms of service", path: "/terms" }]} />
      <h1 className="mt-6 text-3xl font-normal text-brand-900">Terms of service</h1>
      <div className="prose-page">
        <h2>Enquiries and inspections</h2>
        <p>Submitting a booking request does not create a contract. It lets us contact you to arrange a site inspection.</p>
        <h2>Quotations</h2>
        <p>Each quotation lists the scope, materials, inclusions, exclusions, price, payment schedule and validity period. Work begins only after you approve a quotation.</p>
        <h2>Changes in scope</h2>
        <p>Any additional work or change of material is priced and approved by you before it is carried out.</p>
        <h2>Payments, cancellations and refunds</h2>
        <p>Payment milestones, cancellation terms and refund conditions are stated in your quotation and service agreement.</p>
        <h2>Service terms</h2>
        <p>Any warranty or after-service commitment applies only as written in your service agreement.</p>
        <h2>Contact</h2>
        <p>Questions about these terms? Reach us through our <Link href="/contact" className="underline">contact page</Link>.</p>
      </div>
    </div>
  );
}
