import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

// next/image needs the Next.js runtime; render a plain <img> in tests. The boolean `priority` and
// `preload` props are next/image's own (React warns if they reach an <img>), so they are dropped;
// `fetchPriority` and `loading` pass through, so a test can check how an image loads.
// getImageProps (art direction: <picture> with a <source> per screen size) is kept real.
vi.mock("next/image", async () => {
  const actual = await vi.importActual<typeof import("next/image")>("next/image");
  return {
    ...actual,
    default: ({ src, alt, fill: _fill, priority: _priority, preload: _preload, sizes: _sizes, ...rest }: Record<string, unknown>) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={String(src)} alt={String(alt ?? "")} {...rest} />
    ),
  };
});
