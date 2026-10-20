import Link from "next/link";
import { Emoji } from "@/components/Emoji";
import { PhotoCrop } from "@/components/PhotoCrop";
import { CtaBanner } from "@/components/CtaBanner";
import { PageHero } from "@/components/PageHero";
import { images } from "@/config/images";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: `About Our Managed House Painters in ${site.city}`,
  description: `${site.name} runs house painting in ${site.city} end to end, so you deal with one accountable team: on-site inspection, itemised quotation and supervised painters.`,
  path: "/about",
});

const principles = [
  { title: "Itemised quotations", text: "Inclusions, exclusions and a payment schedule, in writing.", tint: "bg-sunshine", emoji: "receipt" as const },
  { title: "No silent swaps", text: "The paint brand and range you approve is what goes on the wall.", tint: "bg-sky-wash", emoji: "artist-palette" as const },
  { title: "Approved changes only", text: "Any change in scope is priced and approved before it's charged.", tint: "bg-rose-wash", emoji: "handshake" as const },
  { title: "Checked before closing", text: "A quality checklist and a walkthrough with you before we hand over.", tint: "bg-peach-wash", emoji: "check-mark-button" as const },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        crumbs={[{ name: "About", path: "/about" }]}
        title={<>Managed house painting in {site.city}, made <span className="text-gradient">stress-free</span></>}
        intro={`Getting a home painted in ${site.city} usually means finding a painter, negotiating a rate, buying paint yourself and checking the work every day. ${site.name} takes all of that off your hands.`}
        image={images.painterWindow}
        shape="scallop"
        backdrop="#244fe5"
        emoji="star-struck"
        tint="bg-sky-wash"
      />

      <section className="container-page mt-20 grid items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="eyebrow">Our model</p>
          <h2 className="mt-3 text-4xl font-normal md:text-5xl">A managed service, <span className="text-outline-ink">not</span> a directory</h2>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            We don&apos;t list painters for you to choose from. We inspect your property, prepare the quotation, assign a
            vetted painting team, arrange materials and check the work. You get one point of contact and one team
            responsible for the result.
          </p>
        </div>
        <div className="relative aspect-[4/3]">
          <PhotoCrop image={images.livingTeal} shape="blob2" backdrop="#ffd84d" sizes="(min-width: 1024px) 50vw, 100vw" className="absolute inset-0" />
        </div>
      </section>

      <section className="container-page mt-24">
        <p className="eyebrow">How we work</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {principles.map((p) => (
            <div key={p.title} className={`reveal card p-6 ${p.tint}`}>
              <Emoji name={p.emoji} size={56} />
              <h3 className="mt-3 text-xl font-normal">{p.title}</h3>
              <p className="mt-2 text-muted">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page mt-24">
        <div className="card bg-ink p-8 text-on-ink md:p-12">
          <h2 className="flex items-center gap-3 text-3xl font-normal md:text-4xl"><Emoji name="round-pushpin" size={48} /> Where we work</h2>
          <p className="mt-4 max-w-3xl text-on-ink/75">
            We are starting with selected localities of {site.city} so our supervisors can visit every site and fix
            problems quickly:
          </p>
          <p className="mt-4 font-display text-xl font-bold text-sunshine">{site.areas.join(" · ")}</p>
          <Link href="/services/house-painting/agra#localities" className="mt-6 inline-flex min-h-11 items-center font-semibold text-on-ink underline decoration-golden underline-offset-4 hover:text-golden">
            How we work in each area of {site.city}
          </Link>
        </div>
      </section>
      <CtaBanner />
    </>
  );
}
