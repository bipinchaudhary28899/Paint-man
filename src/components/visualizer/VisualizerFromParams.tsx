"use client";

import { useMemo } from "react";
import { getColour } from "@/lib/colours/search";
import { useBrandShade } from "../useBrandShade";
import { useUrlQuery } from "../useUrlQuery";
import type { ModelId, Segmenter } from "./segmenter";
import { Visualizer } from "./Visualizer";

// The visualizer started from a link: ?colour=PM-502 (a Paint Man shade), ?shade=asian-paints:7982
// (a brand shade, looked up through the catalogue API) and ?model=b1|b2 (evaluation only). It reads
// the query in the browser so /visualizer stays a static page: the server HTML is the default
// visualizer, which hydrates in place; the starting shade then arrives as a prop, which the
// visualizer applies without remounting (and never over a shade the visitor has picked).

export function visualizerModel(model: string | null): ModelId {
  return model === "b1" || model === "b2" ? model : "b0";
}

export function VisualizerFromParams({ segmenterFactory }: { segmenterFactory?: () => Segmenter }) {
  const params = useUrlQuery();
  const code = params.get("colour");
  const ours = code ? getColour(code) : undefined;
  const brand = useBrandShade(ours ? null : params.get("shade"));
  const start = useMemo(
    () =>
      ours
        ? { name: ours.name, hex: ours.hex, code: ours.code }
        : brand
          ? { name: brand.name, hex: brand.hex, code: `${brand.brandName} ${brand.code}`, bookQuery: `shade=${encodeURIComponent(brand.id)}` }
          : undefined,
    [ours, brand],
  );
  return <Visualizer initialShade={start} model={visualizerModel(params.get("model"))} segmenterFactory={segmenterFactory} />;
}
