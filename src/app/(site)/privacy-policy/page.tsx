import { Breadcrumbs } from "@/components/Breadcrumbs";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: `Privacy Policy for Painting Services in ${site.city}`,
  description: `How ${site.name} collects, uses and protects the details you share when booking a painting inspection in ${site.city}. We never sell your personal data.`,
  path: "/privacy-policy",
});

// Starter text only. Have it reviewed by a qualified professional before launch.
export default function PrivacyPage() {
  return (
    <div className="container-page max-w-3xl py-10">
      <Breadcrumbs items={[{ name: "Privacy policy", path: "/privacy-policy" }]} />
      <h1 className="mt-6 text-3xl font-normal text-brand-900">Privacy policy</h1>
      <div className="prose-page">
        <p>This policy explains how {site.legalName || site.name} (&quot;we&quot;) handles personal information collected through this website.</p>
        <h2>Information we collect</h2>
        <ul>
          <li>Details you submit in our forms: name, mobile number, locality, property type, service needed, preferred date and your message.</li>
          <li>Basic technical information such as the page you came from and campaign tags in the link you used.</li>
        </ul>
        <h2>How we use it</h2>
        <p>We use your information to contact you about your request, schedule inspections, prepare quotations and deliver the service you ask for. We do not sell your personal information.</p>
        <h2>Sharing</h2>
        <p>We share only what is needed with the people who carry out your job, such as our inspector and assigned painting team, and with service providers that host our systems.</p>
        <h2>Retention</h2>
        <p>We keep enquiry records only as long as needed for the purposes above and for legal, tax and accounting requirements.</p>
        <h2>Your choices</h2>
        <p>You can ask us to access, correct or delete your information, or withdraw consent to be contacted{site.email ? <> by writing to <a href={`mailto:${site.email}`} className="underline">{site.email}</a></> : " by contacting us"}.</p>
        <h2>Changes</h2>
        <p>We may update this policy. The latest version will always be on this page.</p>
      </div>
    </div>
  );
}
