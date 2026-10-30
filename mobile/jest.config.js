// Tests for the app (jest-expo + Testing Library). The website's Vitest never sees them: its
// projects only match ../tests/**. tsconfig paths (`@/` website src, `~/` app src) are mapped by
// jest-expo. The coverage gate mirrors the website's: 90% of the app's testable surface. Screens
// in src/app are excluded, as the website excludes its pages: they are thin compositions of the
// tested components, checked by typecheck and in the simulator.
module.exports = {
  preset: "jest-expo",
  testMatch: ["<rootDir>/tests/**/*.test.ts?(x)"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  // A suite's first test also compiles React Native; with every suite starting at once that can
  // pass the 5 s default on a busy machine (a timeout, not a threshold).
  testTimeout: 20_000,
  // Metro resolves a scaled image (logo.png → logo@2x.png); Jest needs the file itself.
  moduleNameMapper: { "/paintsaathi-horizontal-color\\.png$": "<rootDir>/../public/brand/01-horizontal/paintsaathi-horizontal-color@2x.png" },
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/app/**"],
  coverageThreshold: { global: { statements: 90, branches: 90, functions: 90, lines: 90 } },
  coverageReporters: ["text-summary", "text"],
};
