import Image from "next/image";
import Link from "next/link";
import { images } from "@/config/images";
import { Arrow } from "./Arrow";

const diagnostics = ["Moisture reading", "Crack mapping", "Old-paint adhesion", "Wall measurement"];

// "We diagnose first": the inspection before any paint, over a photo of a weathered wall
// with flaking plaster round a window grill (what the inspector reads).
// Phones: the copy sits on a pale wash over the top of the photo (washed top to bottom), the wall
// shows below it and the four checks run in one swipe row along the bottom. Tablets and desktop: the
// copy on the left over a sideways wash, the checks wrapping along the bottom.
export function Diagnose() {
  return (
    <section aria-label="We diagnose first" className="relative z-[1] mt-14 px-5 tab:mt-[88px] tab:px-8 desk:mt-[120px]">
      <div className="relative mx-auto h-[620px] max-w-[1200px] overflow-hidden rounded-[24px] bg-sand tab:h-[600px] tab:rounded-[28px] desk:h-[760px]">
        <Image
          src={images.weatheredWall.src}
          alt={images.weatheredWall.alt}
          fill
          sizes="(min-width: 1264px) 1200px, 100vw"
          className="object-cover object-[62%_bottom] tab:object-[70%_center]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(248,245,239,0.97)_0%,rgba(248,245,239,0.92)_52%,rgba(248,245,239,0)_80%)] tab:bg-[linear-gradient(100deg,rgba(248,245,239,0.97)_0%,rgba(248,245,239,0.86)_45%,rgba(248,245,239,0)_76%)] desk:bg-[linear-gradient(100deg,rgba(248,245,239,0.96)_0%,rgba(248,245,239,0.82)_38%,rgba(248,245,239,0)_68%)]"
        />
        <div className="relative px-[22px] py-[26px] tab:max-w-[518px] tab:px-11 tab:py-[52px] desk:max-w-[560px] desk:p-16 desk:pt-[72px]">
          <p className="text-[17px] text-muted tab:text-[20px] desk:text-[22px]">Hum sirf paint nahi karte.</p>
          <h2 className="mt-1 text-[40px] leading-none tracking-[-0.02em] max-desk:tracking-[-0.02em]! tab:mt-1.5 tab:text-[58px] desk:text-[clamp(44px,5.4vw,76px)]">
            We diagnose first.
          </h2>
          <p className="mt-4 text-[15px] leading-[1.6] text-ink-soft tab:mt-[22px] tab:text-[16px] tab:leading-[1.65] desk:mt-7 desk:max-w-[420px] desk:text-[17px]">
            Before anyone opens a tin, our inspector reads the wall: moisture, hairline cracks, flaking and old paint that won&apos;t
            hold. What we find goes on your quotation as separate lines, so you pay for repairs you can see, and never for surprises.
          </p>
          <Link href="/book" className="link-arrow mt-2 min-h-11 font-semibold tab:mt-5 tab:font-medium desk:mt-7 desk:min-h-0">
            Book a free inspection <Arrow />
          </Link>
        </div>
        {/* Phones: one row that swipes inside the card (the page never scrolls sideways); wider screens wrap it. */}
        <div
          role="region"
          aria-label="What the inspection checks"
          tabIndex={0}
          className="swipe absolute inset-x-0 bottom-[18px] scroll-px-4 px-4 tab:inset-x-11 tab:bottom-8 tab:block tab:overflow-visible tab:px-0 tab:snap-none desk:inset-x-16 desk:bottom-10"
        >
          <ul className="m-0 flex list-none gap-2 p-0 tab:flex-wrap tab:gap-2.5">
            {diagnostics.map((d) => (
              <li key={d} className="pill shrink-0 snap-start px-3.5 py-[9px] tab:px-4 tab:py-2.5">
                {d}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
