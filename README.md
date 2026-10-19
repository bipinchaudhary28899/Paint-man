# Paint Man – lead generation website (v1)

A Next.js website for a managed painting service in Agra. It collects inspection bookings and contact messages through a Node API route and saves each lead as a row in a Google Sheet.

## Pages

| Path | Purpose |
|---|---|
| `/` | Home: services, process, reasons to choose us, service areas, FAQs |
| `/book` | Inspection booking form (`?service=interior-painting` pre-selects a service; `?palette=` and `?shade=asian-paints:8386` fill in the message) |
| `/colours` | Colour finder over 50,000+ brand shades (`?brand=`, `?q=`, `?family=`, `?sort=`); old `/colours/PM-xxx` links redirect here |
| `/palettes` | Ready three-shade palettes of Asian Paints shades, with the closest Berger and Nerolac shades |
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

## Colour previews and shade data

Every shade is previewed on one room photo (`src/config/scenes.ts`): a wall mask PNG marks the walls, and a
single `multiply` tint in the shade colour is laid over them, the same way the home-page reveal paints the
room, so light, shadow and texture stay real. The phone finder opens a full-screen preview with a swatch
strip. There is no photo upload: the former `/visualizer` was retired and now redirects (308) to `/colours`,
and its named-colour API `/api/v1/colours/web` answers `410 Gone`.

### Brand shades (PaintDB, CC BY 4.0)

`src/data/paintdb.json` is a compact copy of [PaintDB](https://paintdb.com)'s open dataset
(CC BY 4.0): brand, shade code, name, hex, LRV, colour family, undertone. Refresh it with
`npm run data:paintdb` (downloads the CSV and rewrites the file). It is searched in server memory
(`src/lib/colours/brands.ts`) and is the site's only shade catalogue. The colour finder (`/colours`)
is built on it: pick a brand (each is a real link, `/colours?brand=berger`), then a primary colour or
scroll, or search by code, name or hex; 48 shades per load with infinite scroll. Loaded pages stay in the
browser's memory, so scrolling back or reopening a colour family never repeats a request. (The
catalogue routes send `publicCache`, but `src/proxy.ts` currently sets `Cache-Control: no-store` on
every `/api` response, so in practice they are not cached at the edge.) The attribution ("Brand shades: PaintDB,
CC BY 4.0") must stay wherever these shades are shown; hex values approximate each brand's
published shade, and Paint Man is not affiliated with these brands.

### No Paint Man shade codes

Paint Man used to publish 167 shades of its own (PM-xxx codes, `/colours/PM-502` pages). They were
retired: the brands' shade cards already cover them, and customers ask for shades by the brand's code.

- **Palettes** (`src/config/palettes.ts`) use real Asian Paints shades: each old palette colour became
  its nearest Asian Paints shade (OKLab). Tests check every one against the PaintDB data. The palettes
  page also names the closest Berger and Nerolac shade to each.
- **Old URLs:** `src/proxy.ts` answers every old `/colours/PM-xxx` URL (any case, and the short
  forms `/colours/pm502` and `/colours/502` the old pages accepted) with a 308 to the
  finder searching its nearest Asian Paints shade, from the map in `src/config/legacy-shades.ts`. Any
  other `/colours/<x>` is a 404. Never reuse a PM code.
- **Old APIs:** `/api/v1/colours` and `/api/v1/colours/{code}` answer `410 Gone` (code `gone`) and
  point to `/api/v1/colours/paint` and `/api/v1/colours/brands`; for an old code,
  `error.details.replacement` names its nearest Asian Paints shade. `/api/v1/palettes` keeps its fields
  (`colours.featureWall.code` etc.) and adds `id`, `brand` and `brandName` to each shade.

