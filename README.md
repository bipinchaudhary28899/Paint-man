# Paint Man – lead generation website (v1)

A Next.js website for a managed painting service in Agra. It collects inspection bookings and contact messages through a Node API route and saves each lead as a row in a Google Sheet.

## Pages

| Path | Purpose |
|---|---|
| `/` | Home: services, process, reasons to choose us, service areas, FAQs |
| `/book` | Inspection booking form (`?service=interior-painting` pre-selects a service) |
| `/services`, `/services/[slug]` | Service overview plus interior, exterior and rental property pages |
| `/about`, `/faq`, `/contact` | Supporting SEO pages (the contact page has its own form) |
| `/privacy-policy`, `/terms` | Starter legal text (get it reviewed before launch) |
| `/thank-you` | Confirmation page after a form is submitted (`noindex`) |
| `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`, `/opengraph-image` | Generated automatically |

## Run locally

```bash
npm install
npm run dev -- --port 3005
```

Without Google Sheets settings, leads are written to `data/leads.csv` on your machine (in both `npm run dev` and `npm start`). On Vercel, Google Sheets is required.

## Configure

1. **Business details:** edit [src/config/site.ts](src/config/site.ts). Fill every `TODO`: phone, WhatsApp, email, address and Google Business Profile URL. Empty fields are hidden on the site and left out of the structured data.
2. **Photos:** placeholder stock photos from Pexels (free licence) are listed in [src/config/images.ts](src/config/images.ts). Replace them with photos of your own jobs before launch.
3. **Emoji:** 3D emoji images from [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji) (MIT licence) are stored in `public/emoji/`. To add another one, download it from that repository into the folder and add its name to `src/components/Emoji.tsx`.
4. **Environment:** copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SITE_URL` to the live domain.

### Google Sheets lead storage

1. Create a Google Sheet with a tab named `Leads`. The header row is added automatically on the first lead.
2. In Google Cloud Console, enable the **Google Sheets API**, then create a **service account** and a JSON key for it.
3. Share the sheet with the service account's email address and give it **Editor** access.
4. Set `GOOGLE_SHEETS_ID` (the long ID in the sheet URL), `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` in `.env.local` or in your hosting provider's environment settings.

On Vercel (read-only disk), a form submission fails with an error if Google Sheets isn't configured, so leads are never silently lost. The admin page then says exactly which setting to fix.

Each row records: time (IST), lead ID, type, name, phone, locality, property type, service, preferred date, message, page, UTM source, medium and campaign, landing page, referrer, and status (starts as `New`). Your team can update the status column as they follow up.

## SEO built in

- Unique title, meta description, canonical URL, and Open Graph and Twitter tags on every page
- `HousePainter` (LocalBusiness) schema with the localities you serve, plus `WebSite`, `Service`, `FAQPage` and `BreadcrumbList` schema
- `sitemap.xml`, `robots.txt`, a generated social share image, a web manifest, and `geo.region`/`geo.placename` meta tags
- Static pages rendered on the server, no layout-shifting images, a self-hosted font, semantic headings and accessible forms
- Mobile call/WhatsApp/book bar, plus UTM capture so you can see which channel each lead came from

## What gets you to the top of Google (not code)

The code makes the site easy for Google to read. Ranking for searches like "painters in Agra" depends mostly on these steps:

1. **Google Business Profile:** create and verify it with the same name, phone and address as the site. This drives the map results, which matter most for local searches.
2. **Google Search Console and Bing Webmaster Tools:** verify the site (set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, and `NEXT_PUBLIC_BING_SITE_VERIFICATION` unless you import the site into Bing from Search Console) and submit `/sitemap.xml`. The step-by-step owner list is in `docs/seo-owner-checklist.md`.
3. **Real reviews** on your Google Business Profile from every completed job.
4. **Consistent listings** on Justdial, Sulekha, IndiaMART and similar directories, using the same name, address and phone everywhere.
5. **Content:** real before-and-after project photos, a page for each locality once you have work to show there, and Hindi versions of key pages.
6. **Fast hosting** (for example Vercel) on your own domain with HTTPS.

## Private leads page (`/admin`)

Leads can only be viewed at `/admin` after signing in. There's a small **Staff login** link at the bottom of the footer. It's marked `nofollow`, and the admin pages are hidden from search engines.

**Set it up:**

1. Run `npm run admin:hash` and type a strong password (12+ characters). Your typing is hidden and doesn't go into shell history.
2. Copy the two lines it prints, `ADMIN_PASSWORD_HASH` and `SESSION_SECRET`, into `.env.local` (or your host's environment settings). Also set `ADMIN_USERNAME`.
3. Restart the server and sign in at `/admin`.

Only a scrypt hash of the password is stored, never the password itself. Changing `SESSION_SECRET` signs everyone out immediately.

> `.env.local` currently holds a **local development login** created during setup. Replace it with your own before going live.

## Tests

```bash
npm test
```

Vitest runs **161 tests**: backend tests in Node, frontend tests in jsdom (a simulated browser) using React Testing Library.

| Area | What is covered |
|---|---|
| Rate limits | In-memory and Upstash Redis limiters, window reset, Vercel KV env detection, fallback to memory if Redis is down |
| Lead validation | Indian mobile normalisation, required fields, allowed values, length caps, honeypot |
| Lead storage | Sheet column mapping, IST timestamps, CSV formula-injection protection, CSV parsing, newest-first reading, no local-file fallback in production |
| Leads API | Success returns no data, field errors, bot drop, cross-site block, body size limit, bad JSON, per-IP rate limit, no personal data in logs |
| Auth | scrypt hashing, tamper/expiry/forgery checks on sessions, cookie flags, generic errors (no username enumeration), lockout after 5 failures, cross-site block, logout, proxy redirect, server-side session check |
| SEO | Metadata, structured data, sitemap excludes private pages, robots rules |
| Frontend | Booking/contact forms (payload, errors, double-submit, honeypot), login form, leads table (counts, search, filters, HTML shown as text), header/footer links, FAQ, breadcrumbs, JSON-LD escaping, UTM capture |

## Security

- **Admin access:** each admin page and API checks the signed session on the server. A proxy redirects requests without a cookie first, but it isn't the access control on its own.
- **Sessions:** HMAC-SHA256 signed and expire after 8 hours. The cookie is `HttpOnly`, `SameSite=Strict`, and `Secure` with the `__Host-` prefix in production, so page scripts can't read it.
- **Login:** scrypt password hash and constant-time comparisons. The same error is shown for a wrong username or password. Locks out after 5 failed attempts per IP (30 site-wide) per 15 minutes.
- **No data leaks:** the public API never returns stored data. Lead data is only read on the server for a signed-in admin. Error responses are generic, logs never include personal details, and `/admin` and `/api` responses are `no-store` and `noindex`.
- **Request protection:** cross-site POSTs are rejected by an Origin check, request bodies are capped at 16 KB, inputs are validated with zod, and spam is limited by a honeypot field and a per-IP limit.
- **Headers:** Content Security Policy, HSTS (production), `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy, COOP/CORP, and a Permissions-Policy.
- **Injection:** React escapes everything shown on the page, JSON-LD escapes `<`, and spreadsheet cells are written as plain text so they can't run as formulas.
- **Secrets:** stored only in environment variables. `.env*` files are git-ignored, and `.env.local` is readable by your user account only.

**Known limit:** the Content Security Policy allows inline scripts, because Next.js needs them on statically generated pages.

## Deploying on Vercel

1. Push the project to GitHub, then **Add New → Project** in Vercel and import the repository. The Next.js settings are detected automatically.
2. Under **Settings → Environment Variables**, add the following for **Production** (and Preview if you want to test there):
   - `NEXT_PUBLIC_SITE_URL`: your domain, e.g. `https://www.yourdomain.in`
   - `GOOGLE_SHEETS_ID`, `GOOGLE_SHEETS_TAB`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`: paste the key exactly as it is in the JSON file, including the `\n` sequences
   - `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`: from `npm run admin:hash`
   - `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_BING_SITE_VERIFICATION` (optional)
3. **Add Redis for rate limits (important):** in Vercel, open **Storage → Marketplace → Upstash for Redis** (free tier is fine) and connect it to the project. It sets `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically. Vercel runs the site on many serverless instances that don't share memory, so without Redis the login lockout and form spam limits only apply per instance.
4. Add your domain under **Settings → Domains**. HTTPS and HSTS are handled automatically.
5. After deploying, check that `/admin` asks for a password, submit a test booking, then confirm it appears on `/admin` and in the Google Sheet.

**Handled automatically on Vercel:**
- The site URL falls back to the project's production URL if `NEXT_PUBLIC_SITE_URL` isn't set.
- **Preview deployments** are blocked from search engines (`robots.txt` disallows everything and an `X-Robots-Tag: noindex` header is sent), so they never compete with your real site.
- Leads always go to Google Sheets on Vercel, because its file system is read-only. The site refuses to fall back to a local file there, and `/admin` tells you which Sheets setting is missing or wrong.
- Visitor IPs come from Vercel's own `x-forwarded-for` header, which visitors can't fake.

## Wall colour visualizer (`/visualizer`)

Customers drop in a room photo, pick a shade, and only the wall surfaces change colour.

**Model.** Wall detection is semantic segmentation with **SegFormer-B0 fine-tuned on ADE20K**
(`Xenova/segformer-b0-finetuned-ade-512-512`, 4.4 MB quantised ONNX), run **in the browser** by
`@huggingface/transformers` + ONNX Runtime WebAssembly inside a Web Worker
(`src/components/visualizer/segment.worker.ts`). ADE20K has an explicit `wall` class, so this is a
wall-specific detector rather than a generic object segmenter; it does not need SAM, a server, an
API key, or any upload. The model and runtime are fetched once (Hugging Face / jsDelivr; the CSP in
`next.config.ts` allows exactly those hosts) and cached by the browser.

**Pipeline.** Photo → downscaled to ≤1400 px (`lib/visualizer/files.ts`) → worker returns the `wall`
mask at photo size, drops specks, and labels each connected wall surface → page keeps the mask and
labels (`components/visualizer/Visualizer.tsx`). Selection = the surfaces the user has kept (tap a
surface to toggle it), feathered 1–2 px (`lib/visualizer/mask.ts`; the brush helpers there are kept
for the eval tooling but no longer exposed in the UI). Recolouring
(`lib/visualizer/recolour.ts`) works in OKLab: each wall pixel keeps its lightness *relative to the
wall's mean*, takes the shade's hue/chroma, and is blended by the soft mask, so shadows, light
falloff and plaster texture survive and non-wall pixels are byte-for-byte unchanged. Changing shade
is a local repaint (no inference); hold-to-compare shows the original; Download saves a JPEG.

**Fallbacks.** If the model cannot load (offline, old browser) or finds no confident wall (< 3 % of
the image), the page says so and suggests a better photo; nothing is painted.
Nothing is ever recoloured silently across the whole image.

**Shade sources.** Our catalogue (167 shades, `/api/v1/colours`); **50,762 brand shades** from 25 paint
brands (Asian Paints, Berger, Nerolac, Dulux, Sherwin-Williams…) via `/api/v1/colours/paint` and
`/api/v1/colours/brands`; and ~32,000 public named colours from color.pizza via `/api/v1/colours/web`
(proxied and cached server-side for a day; the browser never calls the third party).

### Brand shades (PaintDB, CC BY 4.0)

`src/data/paintdb.json` is a compact copy of [PaintDB](https://paintdb.com)'s open dataset
(CC BY 4.0): brand, shade code, name, hex, LRV, colour family, undertone. Refresh it with
`npm run data:paintdb` (downloads the CSV and rewrites the file). It is searched in server memory
(`src/lib/colours/brands.ts`); the colour finder shows it as Brand shades: pick a brand, then a
primary colour or scroll, 48 shades per load with infinite scroll. Loaded pages stay in the
browser's memory and each API page is cached at Vercel's edge for a day, so scrolling back or
reopening a colour family never repeats a request. The attribution ("Brand shades: PaintDB,
CC BY 4.0") must stay wherever these shades are shown; hex values approximate each brand's
published shade, and Paint Man is not affiliated with these brands.

**Limitations** (measured on 14 hard room photos, see `docs/visualizer-eval/REPORT.md`). SegFormer-B0
is small: on the eval set 8/14 photos needed no correction, 3 needed a brush stroke, and 3 failed —
glossy flat white panels (wardrobe doors, a roller blind) are painted as wall, and a near-black wall
beside a near-black wardrobe breaks into patches. Those are label errors, so the speck filter, pocket
fill, feather and fallback knobs cannot fix them; the surface toggle exists for exactly these cases,
and `?model=b1` (14 MB) fixes the dark-room case. Edges are coarse (the model works at
512 px). Detection takes ~1.7–3.8 s per 1080 px photo on a laptop (median 2.5 s), longer on low-end
phones; the first visit also downloads ~9 MB (runtime + model). Textured or patterned walls keep
their texture but lose their original hue entirely; peeling paint is painted as the surrounding wall
only where the model agrees.
