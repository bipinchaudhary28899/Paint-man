import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
  // "server-only" throws outside a React Server Components build; stub it in tests.
  "server-only": fileURLToPath(new URL("./tests/support/empty.ts", import.meta.url)),
};

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    // The brand-shade suites index 50,000 shades on first use; under coverage on a busy machine
    // that alone can pass the 5 s default, so allow more time (a timeout, not a threshold).
    testTimeout: 20_000,
    // Coverage gate (see AGENTS.md): the testable surface must stay above 90%.
    // Next.js pages, layouts and metadata routes are rendered by the framework and
    // checked by typecheck + the browser, so they are excluded from the gate.
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/components/**", "src/config/**", "src/app/api/**"],
      // The segmentation worker needs a real browser (WebAssembly, Web Workers); its logic lives in src/lib/visualizer, which is tested.
      exclude: ["src/lib/auth/config.ts", "src/components/visualizer/segment.worker.ts"],
      reporter: ["text-summary", "text"],
      thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 },
    },
    projects: [
      {
        extends: true,
        test: { name: "backend", environment: "node", include: ["tests/backend/**/*.test.ts"] },
      },
      {
        extends: true,
        test: {
          name: "frontend",
          environment: "jsdom",
          include: ["tests/frontend/**/*.test.tsx"],
          setupFiles: ["tests/support/setup-dom.tsx"],
        },
      },
    ],
  },
});
