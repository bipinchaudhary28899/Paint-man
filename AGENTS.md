<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Paint Saathi — rules for every agent working in this repo

Paint Saathi (formerly Paint Man; live at https://paintsaathi.in) is a managed house-painting service, starting in Agra and built to add more cities. The site exists to rank for local painting searches and turn visitors into inspection bookings. Every change is judged against the three rules below; a change that breaks one is not done.

## 1. Search first: nothing ships that costs a ranking

- **One `h1` per page and it carries the page's keyword naturally** ("Interior wall painting services in Agra"). Headings are real `h2`/`h3` in order; never a styled `div`, never a skipped level. Decorative spans (`.brush`, `.text-outline-ink`, `.text-gradient`) go *inside* the heading so the text stays crawlable.
- **Every page sets metadata through `pageMetadata()`** in `src/lib/seo.ts`: the page passes only `{Topic} in Agra` and the root layout template adds `| Paint Saathi` (`TITLE_SUFFIX`, from `site.name`), so the full title is `{Topic} in Agra | Paint Saathi`, ≤ 60 chars (`fullTitle()`), with the brand and "Agra" once each; description 140–155 chars with one benefit and one proof, canonical path. `pageMetadata()` also sets `og:image`/`twitter:image` (the site card, or a page's own `image`); never return a hand-built `openGraph` object, which would drop the image. New public routes go in `src/app/sitemap.ts` the same commit, with their content date in `src/config/seo-dates.ts` (bump it when the copy changes; never the build time).
- **Indexing:** pages that stay out of the index (`/thank-you`, `/admin`) use `noindex`, never a robots.txt block, so Google can read it; robots.txt blocks only `/api/`. Paint Man has no shade catalogue of its own any more: the brands' shade cards (PaintDB) are the only one. The brand shade-card pages (`/shade-cards`, `/shade-cards/<brand>`, `/shade-cards/<brand>/<family>`) are built from that data by `src/lib/colours/shade-cards.ts`, copy included, so counts stay true after a refresh; a family under `FAMILY_PAGE_MIN` shades gets no page. Only the major brands sold in India are in the data (`INDIA_BRANDS` in `scripts/import-paintdb.mjs`); add a brand there, never by hand. Legacy `/colours/PM-xxx` URLs 308 to the finder (`/colours?brand=asian-paints&q=<nearest code>`) via `src/proxy.ts` + `src/config/legacy-shades.ts`; never reuse PM codes, and never add `/colours/<code>` pages back to the sitemap.
- **Structured data stays wired**: `LocalBusiness` + `WebSite` in the site layout, `BreadcrumbList` via `<Breadcrumbs>`, `FAQPage` via `faqJsonLd()`: mark up each Q&A once site-wide (service FAQs on their service page, general FAQs on /faq), even where a page repeats them visually. Use the `<JsonLd>` component (it escapes `<`).
- **Text is text.** No words in images or SVG only. Marquees and outlined giants are `aria-hidden` duplicates of real copy. Every photo has a descriptive, local `alt` ("Freshly painted teal living room in Dayalbagh, Agra"); decorative shapes and emoji use `alt=""`.
- **Core Web Vitals budget (mobile):** LCP ≤ 2.0 s, INP ≤ 200 ms, CLS ≤ 0.05. The hero (LCP) image loads first with matching `sizes`: `preload` (which replaces Next 16's deprecated `priority`) or `loading="eager"` + `fetchPriority="high"`; images below the fold lazy-load; every image and marquee reserves its space. CSS ships as one cached stylesheet (`experimental.inlineCss` was measured and left off: it copied the CSS into every document and prefetch). Fonts only via `next/font` (DM Serif Display regular + italic, Manrope variable). Motion is CSS-only, composited (`transform`, `clip-path`, `height` on fixed-width boxes), scroll-driven with `animation-timeline` where possible, and honours `prefers-reduced-motion`. Scroll effects use CSS scroll-driven animation first; a JS fallback must be a passive, rAF-throttled listener that only changes transforms/opacity/clip. No layout thrash, no autoplaying video, no interstitials.
- **City-scoped URLs (how the site grows):** national pages target India (home: "Book House Painters Online in India"; `/services/house-painting`; the service hubs `/services/<service>`, whose copy names no city). Each city has `/services/house-painting/<city>` (its main page: services there, localities with anchors, weather, the booking form) and `/services/<service>/<city>` (local intro, notes, FAQs, booking form), titled `{Topic} in {City}`. Cities live in `cities` in `src/config/site.ts` with `status`: `"live"` pages are indexed and in the sitemap; `"soon"` cities (Delhi NCR, Bangalore today) are noindex waitlist pages, out of the sitemap, until the owner opens them (then add `local` copy to each service and the localities). Never publish a city page that claims painters where we do not work, and never generate locality pages from a template. Menus and the footer link hub come from `src/config/nav.ts`. Every booking form on the site is our own `LeadForm` (through `BookingSection` on hubs, city and shade-card pages); never add a second, shorter lead form. `/areas` 308s to `/services/house-painting/agra`.
- **Local signals by design:** the city in each city page's `h1`, "Now booking in Agra" sticker, the localities list on the city page, the footer address. Service promises (zero advance payment, full estimate before work, timed and documented work, quality, advice in the customer's interest) come from `promises` in `src/config/site.ts`; state them only as the owner has.
- **Mobile first:** fixed bottom CTA bar, tap targets ≥ 44 px, no horizontal scroll. A page must be fully readable with JS and motion off.
- Before finishing UI work: `npm run typecheck`, `npm test`, then open the page in the browser preview and check the heading outline, alt text, and that nothing shifts on load.

## 2. Tests: coverage stays above 90%

- `npm run test:coverage` must pass. The gate (in `vitest.config.mts`) covers `src/lib/**`, `src/components/**`, `src/config/**` and `src/app/api/**` at **90% statements, branches, functions and lines**. Next.js pages, layouts and metadata routes are excluded because the framework renders them; they are covered by typecheck and the browser check.
- Every new module ships with its tests in the same change: `tests/backend/**/*.test.ts` (node) for libs, config and API routes; `tests/frontend/**/*.test.tsx` (jsdom + Testing Library) for components. Test behaviour through the public surface (what a user does, what a client receives), not implementation details.
- Data files (`src/config/palettes.ts`, `src/config/legacy-shades.ts`, `src/config/site.ts`) get integrity tests: unique keys, valid values, cross-references that resolve (every palette shade matches `getBrandShade(id)` exactly; every legacy code maps to a real Asian Paints shade).
- Never lower a threshold or widen the exclude list to make a build pass. If a file is genuinely untestable, say so in the PR and move the logic into a testable module.
- Use `tests/support/request.ts` to build same-origin requests for route handlers; mock storage (`@/lib/leads/store`) rather than touching real sheets or files.

## 3. APIs are built for machines and AI integrations

- Public JSON lives under **`/api/v1/`**. The version is in the path and in the body; a breaking change means `/api/v2/` with both versions served during migration. Additive changes (new optional fields) do not bump the version.
- **Every response uses the envelope in `src/lib/api.ts`** (`apiOk` / `apiError`); never return a bare object or array:
  ```json
  {
    "apiVersion": "v1",
    "kind": "paint-colour",
    "label": "1 brand paint shade matching \"8386\", from Asian Paints (page 1 of 1)",
    "data": { ... } | [ ... ],
    "meta": { "total": 1, "query": { ... }, "generatedAt": "2026-10-18T07:00:00.000Z" },
    "links": { "self": "/api/v1/colours/paint?brand=asian-paints&q=8386", "html": "/colours?brand=asian-paints&q=8386" }
  }
  ```
  - `data` is always the payload. `label` is one plain-language sentence an LLM or a person can read without the schema. `kind` names the record type (singular). `meta` carries counts, the echoed query and `generatedAt`. `links` gives the API `self`, the human `html` page and any next action (`book`).
  - Errors: `{ apiVersion, kind: "error", label, error: { code, message, details? }, meta }` with the right HTTP status. `code` is a stable snake_case identifier; `details` holds valid options when the input was a bad enum. A retired endpoint answers `410` with code `gone` and its successors in `details` (as `/api/v1/colours` and `/api/v1/colours/{code}` do, pointing to `/api/v1/colours/paint`).
  - Validate and bound every query parameter (enum guards, integer limits ≤ 100, string length caps). Unknown values are a 400 with hints, never a silent default.
  - Read-only catalogue endpoints send `publicCache`; anything touching personal data sends `noStore` and checks `isSameOrigin` + rate limits (see `/api/leads`).
  - Field names are camelCase, stable and self-describing (`featureWall`, not `c1`). Dates are ISO-8601 strings. Money is integer paise with a `currency` field.
- Each endpoint is documented in a comment at the top of its `route.ts` (method, path, parameters, one example) and has tests for the success envelope, each validation error and caching headers.

## Design system

The visual language is the editorial site design (tokens in `src/app/globals.css` under `:root` / `[data-theme="night"]`): cream canvas `#f8f5ef`, ink `#242522`, terracotta action `#a8532f` (hover `#8f4526`) with a lighter terracotta `#c76b4a` for italic accents, golden `#e9b949`, sage `#71856a` / deep sage `#5b6e55`, sand `#e8d7c5` panels. DM Serif Display (regular + italic) for every heading, Manrope for text and UI; no other faces. Hairline borders (`border-line`), soft radii (20–28px), one soft photo shadow (`.frame-shadow`); never hard offset shadows or 2px ink borders. Headings get exactly one italic accent word (`<em>`). Buttons: `btn-primary` (terracotta pill, cream text), `btn-secondary` (hairline ghost). Motion is scroll-driven CSS (`animation-timeline: view()`): parallax chips, the pinned "colour goes on" reveal, the colour wheel; all off under `prefers-reduced-motion`. Use the token utilities (`bg-canvas`, `text-muted`, `bg-sage-deep text-on-ink`) rather than raw hex.

## Working here

- Read `node_modules/next/dist/docs/` for any Next.js API before using it (see the block at the top).
- Commands: `npm run dev`, `npm run typecheck`, `npm test`, `npm run test:coverage`, `npm run build`.
- Business facts (phone, address, areas, services, FAQs) live in `src/config/site.ts`; never hard-code them in pages.
- There is no photo upload or in-browser model: the former wall visualizer was retired (`/visualizer` 308s to `/colours`, `/api/v1/colours/web` answers 410); shades are previewed on the finder's room photo (`src/config/scenes.ts`, one multiply tint over the wall mask, as the home reveal does). The CSP (`next.config.ts`) allows only this origin plus Pexels images; keep it that tight. Shade data comes from the vendored PaintDB brand shades in `src/data/paintdb.json` (server-only `src/lib/colours/brands.ts`; client components get it through `/api/v1/colours/paint` and `/brands` or as props; CC BY 4.0: keep the attribution wherever they are shown; refresh with `npm run data:paintdb`) and the palettes in `src/config/palettes.ts` (copies of PaintDB shades, checked against it). The name is `site.name` (never hard-code it). Brand assets live in `public/brand` (the owner's Paint Saathi logo pack): the header and footer use the horizontal logo through `Wordmark` (src/components/Logo.tsx), and the pack's icons are the favicon, app icons and schema logo. Use them rather than drawing the mark.
- Do not log or store personal data beyond `saveLead`; never echo submitted lead data back to the browser.
