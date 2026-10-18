import { ImageResponse } from "next/og";
import { ICON_SIZES } from "@/lib/seo";

// Raster app icons (/icon/192, /icon/512) for the web manifest, Android home screens and the
// LocalBusiness logo. Same mark as icon.svg and the header logo: the terracotta dot on the cream
// canvas. Full-bleed, with the dot inside the centre 80%, so the 512 also works as a maskable icon.
export function generateImageMetadata() {
  return ICON_SIZES.map((size) => ({ id: String(size), size: { width: size, height: size }, contentType: "image/png" }));
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const requested = String(await id);
  const size = ICON_SIZES.find((s) => String(s) === requested) ?? 512;
  const dot = Math.round(size * 0.5625);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f5ef" }}>
        <div style={{ width: dot, height: dot, borderRadius: dot, background: "#a8532f" }} />
      </div>
    ),
    { width: size, height: size },
  );
}
