import Image from "next/image";
import Link from "next/link";
import { illustrations } from "@/config/images";
import { workFlow } from "@/config/site";

// How the work is done, from booking to handover, as numbered steps. A step with an `image` (the
// owner's PNGs of people painting) shows it above its text, in a box that reserves its space.

type Step = (typeof workFlow)[number];

export function WorkFlow({ steps = workFlow, cta, className = "" }: { steps?: Step[]; cta?: { href: string; label: string }; className?: string }) {
  return (
    <section aria-labelledby="work-flow-heading" className={className}>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">From booking to handover</p>
          <h2 id="work-flow-heading" className="mt-3 text-3xl md:text-5xl">
            How the work <em>gets done</em>
          </h2>
        </div>
        <Image
          src={illustrations.toolbox.src}
          alt={illustrations.toolbox.alt}
          width={illustrations.toolbox.width}
          height={illustrations.toolbox.height}
          sizes="(min-width: 768px) 280px, 200px"
          className="h-auto w-[200px] md:w-[280px]"
        />
      </div>
      <ol className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title}>
            {s.image && (
              <div className="relative mb-5 aspect-[4/3] overflow-hidden rounded-[20px] bg-sand">
                <Image src={s.image.src} alt={s.image.alt} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-contain" />
              </div>
            )}
            <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full bg-terracotta font-display text-xl text-on-ink">
              {i + 1}
            </span>
            <h3 className="mt-4 text-xl">{s.title}</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{s.text}</p>
          </li>
        ))}
      </ol>
      {cta && (
        <Link href={cta.href} className="btn-primary btn-lg mt-10">
          {cta.label}
        </Link>
      )}
    </section>
  );
}
