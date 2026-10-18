import { Emoji, type EmojiName } from "@/components/Emoji";
import Link from "next/link";
import { LeadForm } from "@/components/LeadForm";
import { PageHero } from "@/components/PageHero";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: `Contact ${site.name}: Painters in ${site.city}`,
  description: `Contact ${site.name} for house painting in ${site.city}. Call, WhatsApp or send us a message and our team will get back to you.`,
  path: "/contact",
});

export default function ContactPage() {
  const rows = [
    site.phone && { label: "Phone", tint: "bg-sunshine", emoji: "telephone-receiver" as const, node: <a href={`tel:${site.phone}`} className="hover:text-tangerine">{site.phoneDisplay || site.phone}</a> },
    site.whatsapp && { label: "WhatsApp", tint: "bg-sky-wash", emoji: "speech-balloon" as const, node: <a href={`https://wa.me/${site.whatsapp}`} rel="noopener" className="hover:text-tangerine">Chat on WhatsApp</a> },
    site.email && { label: "Email", tint: "bg-rose-wash", emoji: "mobile-phone" as const, node: <a href={`mailto:${site.email}`} className="hover:text-tangerine">{site.email}</a> },
    {
      label: "Address",
      tint: "bg-peach-wash",
      emoji: "round-pushpin" as const,
      node: (
        <address className="not-italic">
          {site.address.street && <>{site.address.street}, </>}
          {site.city}, {site.region} {site.address.postalCode}
        </address>
      ),
    },
    { label: "Hours", tint: "bg-cream-wash", emoji: "alarm-clock" as const, node: site.hoursDisplay },
  ].filter(Boolean) as { label: string; tint: string; emoji: EmojiName; node: React.ReactNode }[];

  return (
    <>
      <PageHero
        crumbs={[{ name: "Contact", path: "/contact" }]}
        title={<>Say <span className="text-gradient">hello</span></>}
        intro={`Questions about painting your home in ${site.city}? We're happy to help.`}
        tint="bg-rose-wash"
        emoji="speech-balloon"
      />
      <div className="container-page mt-14 grid gap-10 lg:grid-cols-[1fr_1.3fr]">
        <dl className="space-y-4">
          {rows.map((r) => (
            <div key={r.label} className={`reveal flex items-center gap-4 rounded-3xl border border-line p-5 ${r.tint}`}>
              <Emoji name={r.emoji} size={48} className="shrink-0" />
              <div>
                <dt className="text-xs font-bold uppercase tracking-widest text-ink/60">{r.label}</dt>
                <dd className="mt-1 font-display text-xl font-bold">{r.node}</dd>
              </div>
            </div>
          ))}
        </dl>
        <div className="card p-6 md:p-8">
          <h2 className="text-2xl font-normal">Send us a message</h2>
          <p className="mt-1 text-sm text-muted">
            Want a quote? <Link href="/book" className="font-bold text-tangerine-text underline">Book an inspection</Link> instead.
          </p>
          <div className="mt-6"><LeadForm type="contact" /></div>
        </div>
      </div>
    </>
  );
}
