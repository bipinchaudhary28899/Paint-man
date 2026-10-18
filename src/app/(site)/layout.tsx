import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { MobileCtaBar } from "@/components/MobileCtaBar";
import { UtmCapture } from "@/components/UtmCapture";
import { localBusinessJsonLd, websiteJsonLd } from "@/lib/seo";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={[localBusinessJsonLd(), websiteJsonLd()]} />
      <UtmCapture />
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <MobileCtaBar />
    </>
  );
}
