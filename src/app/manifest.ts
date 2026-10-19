import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { ICON_SIZES, iconPath } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} – Painting Services in ${site.city}`,
    short_name: site.name,
    description: site.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#f8f5ef",
    theme_color: "#242522",
    icons: [
      ...ICON_SIZES.map((size) => ({ src: iconPath(size), sizes: `${size}x${size}`, type: "image/png", purpose: "any" as const })),
      // The app icons are full-bleed with the mark inside the centre 80% (the maskable safe
      // zone), so the 512 doubles as the maskable icon.
      { src: iconPath(512), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
