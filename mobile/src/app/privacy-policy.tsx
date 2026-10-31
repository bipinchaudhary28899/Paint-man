import { InlineLink } from "~/components/content/Inline";
import { ProseH2, ProseList, ProseP, ProsePage } from "~/components/content/Prose";
import { Page } from "~/components/site/Page";
import { site } from "~/shared";

export { ScreenError as ErrorBoundary } from "~/components/content/NotFound";

// The website's /privacy-policy (src/app/(site)/privacy-policy/page.tsx), word for word. Starter text
// only, as on the website: to be reviewed by a qualified professional before launch.
export default function PrivacyScreen() {
  return (
    <Page>
      <ProsePage title="Privacy policy" path="/privacy-policy">
        <ProseP>This policy explains how {site.legalName || site.name} (&quot;we&quot;) handles personal information collected through this website.</ProseP>
        <ProseH2>Information we collect</ProseH2>
        <ProseList
          items={[
            "Details you submit in our forms: name, mobile number, locality, property type, service needed, preferred date and your message.",
            "Basic technical information such as the page you came from and campaign tags in the link you used.",
            "Anonymous visit statistics (pages viewed, the referring site, country and device type) through Vercel Web Analytics, from our hosting provider. It uses no cookies and does not identify you.",
          ]}
        />
        <ProseH2>How we use it</ProseH2>
        <ProseP>
          We use your information to contact you about your request, schedule inspections, prepare quotations and deliver the service you ask for. We do not sell your
          personal information.
        </ProseP>
        <ProseH2>Sharing</ProseH2>
        <ProseP>
          We share only what is needed with the people who carry out your job, such as our inspector and assigned painting team, and with service providers that host
          our systems.
        </ProseP>
        <ProseH2>Retention</ProseH2>
        <ProseP>We keep enquiry records only as long as needed for the purposes above and for legal, tax and accounting requirements.</ProseP>
        <ProseH2>Your choices</ProseH2>
        <ProseP>
          You can ask us to access, correct or delete your information, or withdraw consent to be contacted
          {site.email ? (
            <>
              {" "}
              by writing to{" "}
              <InlineLink href={`mailto:${site.email}`} plain>
                {site.email}
              </InlineLink>
            </>
          ) : (
            " by contacting us"
          )}
          .
        </ProseP>
        <ProseH2>Changes</ProseH2>
        <ProseP>We may update this policy. The latest version will always be on this page.</ProseP>
      </ProsePage>
    </Page>
  );
}
