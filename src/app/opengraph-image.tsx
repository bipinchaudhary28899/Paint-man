import { ImageResponse } from "next/og";
import { site } from "@/config/site";

export const alt = `${site.name} – House painting services in ${site.city}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#242522",
          color: "#f8f5ef",
        }}
      >
        <div style={{ display: "flex", gap: 10, fontSize: 36, fontWeight: 700 }}>
          <div style={{ width: 28, height: 28, borderRadius: 999, background: "#c76b4a", marginTop: 8 }} />
          <div style={{ width: 28, height: 28, borderRadius: 999, background: "#e9b949", marginTop: 8 }} />
          <div style={{ width: 28, height: 28, borderRadius: 999, background: "#71856a", marginTop: 8 }} />
          <div style={{ marginLeft: 8 }}>{site.name}</div>
        </div>
        <div style={{ fontSize: 72, fontWeight: 800, marginTop: 20, lineHeight: 1.1 }}>
          {`Your home, painted beautifully. Managed completely.`}
        </div>
        <div style={{ fontSize: 32, marginTop: 30, opacity: 0.9 }}>
          {`Managed house painting in ${site.city} · Inspection · Itemised quote · Supervised painters`}
        </div>
      </div>
    ),
    size,
  );
}
