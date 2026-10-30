import Image from "next/image";
import type { SiteImage } from "@/config/images";
import { Breadcrumbs } from "./Breadcrumbs";
import type { CropShape } from "./PhotoCrop";

type Props = {
  title: React.ReactNode;
  intro?: React.ReactNode;
  crumbs: { name: string; path: string }[];
  image?: SiteImage;
  shape?: CropShape;
  backdrop?: string;
  tint?: string;
  children?: React.ReactNode;
};

// Shared editorial hero for inner pages: eyebrow-less serif title, muted intro, one framed photo.
// `shape`, `backdrop` and `tint` are accepted for compatibility with older callers.
export function PageHero({ title, intro, crumbs, image, children }: Props) {
  return (
    <section className="relative border-b border-line-soft">
      <div className={`container-page grid items-center gap-12 py-14 md:py-20 ${image ? "lg:grid-cols-[1.2fr_1fr]" : ""}`}>
        <div>
          <Breadcrumbs items={crumbs} />
          <h1 className="mt-6 text-[clamp(40px,5vw,68px)] leading-[1.04] tracking-[-0.02em]">{title}</h1>
          {intro && <p className="mt-6 max-w-2xl text-lg leading-[1.65] text-muted">{intro}</p>}
          {children}
        </div>
        {image && (
          <div className="frame-shadow relative aspect-[4/5] w-full max-w-md overflow-hidden lg:ml-auto">
            {/* The hero photo is the mobile LCP: preload it from <head> at high priority (Next 16 deprecates `priority`). */}
            <Image src={image.src} alt={image.alt} fill preload fetchPriority="high" sizes="(min-width: 1024px) 448px, 90vw" className="object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}

