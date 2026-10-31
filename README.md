# Paint Saathi – lead generation website (v1)

A Next.js website for a managed painting service in Agra. It collects inspection bookings and contact messages through a Node API route and saves each lead in a Postgres database (Supabase). Customers sign in with their mobile number and an SMS code to track their projects; the same API serves the Paint Saathi app.

## Pages

| Path | Purpose |
|---|---|
| `/` | Home: services, process, reasons to choose us, service areas, FAQs |
| `/book` | Inspection booking form (`?service=interior-painting` pre-selects a service; `?palette=` and `?shade=asian-paints:8386` fill in the message) |
| `/colours` | Colour finder over 8,500+ shades from India's major brands (`?brand=`, `?q=`, `?family=`, `?sort=`); old `/colours/PM-xxx` links redirect here |
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

Without `DATABASE_URL`, `npm run dev` keeps everything in a local Postgres (PGlite) in `data/dev-db/`, created and migrated on first use: nothing to install. Sign-in codes are printed to the terminal (`[dev OTP] ******3210 → 123456`) until MSG91 is set up. A production build (`npm start`, Vercel) needs `DATABASE_URL`. Delete `data/dev-db/` to start the local database afresh.

## Configure

1. **Business details:** edit [src/config/site.ts](src/config/site.ts). Fill every `TODO`: phone, WhatsApp, email, address and Google Business Profile URL. Empty fields are hidden on the site and left out of the structured data.
2. **Photos:** placeholder stock photos from Pexels (free licence) are listed in [src/config/images.ts](src/config/images.ts). Replace them with photos of your own jobs before launch.
3. **Illustrations:** the owner's Paint Saathi artwork (the painter, the paint can, the toolbox) lives in `public/brand/illustrations/` as transparent WebP, listed in `illustrations` in `src/config/images.ts`. The site uses no icons or emoji.
4. **Environment:** copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SITE_URL` to the live domain.

### Database (Supabase Postgres, Mumbai)

Leads, customer accounts, sessions, projects, inspections and quotations live in Postgres. The schema is `src/lib/db/schema.ts` (Drizzle); its SQL migrations are in `drizzle/`.

1. **Create the project:** at [supabase.com](https://supabase.com) create a project in the **Mumbai (ap-south-1)** region, next to the Vercel functions (`vercel.json` runs them in `bom1`). Save the database password somewhere safe.
2. **Turn off the Data API** (Project Settings → Data API): the site talks to Postgres directly, so nothing should be reachable through Supabase's REST API. (Row level security is on for every table anyway, with no policies.)
3. **Copy the two connection strings** from **Connect** and put your password in each:
   - `DATABASE_URL`: the **Transaction pooler** string (port **6543**). The site uses it at run time; it works with many short-lived serverless functions (the client turns off prepared statements for it).
   - `DATABASE_URL_DIRECT`: the **Direct connection** string (port **5432**), used only for migrations. If your network has no IPv6, use the **Session pooler** string (also port 5432) instead.
4. **Create the tables:** with `DATABASE_URL_DIRECT` in `.env.local` (or your shell), run `npm run db:migrate`. Run it again after every change that adds a migration, **before** deploying that change.
5. **Set the variables on Vercel** (see Deploying below) and redeploy.

Changing the schema: edit `src/lib/db/schema.ts`, run `npm run db:generate` (writes a new SQL file in `drizzle/`, commit it), then `npm run db:migrate`. The local database applies new migrations by itself.

If the database is missing or misconfigured, form submissions fail with a clear error (leads are never silently lost), the account API answers `503`, and `/admin` says which setting to fix.

Each lead records: time, type (booking, contact, quick visit, waitlist), source (website or app), name, phone, address, locality, PIN code, city, property type, service, preferred date, message, job size, page, UTM source, medium and campaign, landing page, referrer, the app's map pin, and status (starts as `new`). Every booking also opens a **project** (stage "Booking received") that the customer sees once they sign in with that number.

### Customer sign-in (SMS codes through MSG91)

Customers sign in with their mobile number and a 6-digit code (valid 5 minutes, 5 tries; only a hash is stored). Codes are sent through MSG91's SMS (flow) API:

1. Register the OTP message on the **DLT** portal (your entity, sender ID and a content template such as "{#var#} is your Paint Saathi sign-in code. It expires in 5 minutes."), as Indian telecom rules require.
2. In MSG91, add the same message as an **SMS template** with the approved DLT template ID and sender, writing the variable as `##otp##`. Copy the MSG91 template ID.
3. Set `MSG91_AUTH_KEY` (MSG91 → API → Auth key) and `MSG91_OTP_TEMPLATE_ID`.

Without them, development prints each code to the server terminal and production answers `503 otp_unavailable` (no one can sign in). Sessions last 30 days on the website (httpOnly cookie `ps_session`, plus a `ps_signed_in=1` hint cookie with no personal data) and 90 days in the app (bearer token). The account API is under `/api/v1/auth`, `/api/v1/me`, `/api/v1/projects` and `/api/v1/bookings`; each route file documents its contract.

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

Vitest runs the backend tests in Node (data tests against a fresh in-memory Postgres per file, `tests/support/db.ts`; never a network database) and the frontend tests in jsdom (a simulated browser) using React Testing Library. `npm run test:coverage` enforces 90% coverage.

| Area | What is covered |
|---|---|
| Rate limits | In-memory and Upstash Redis limiters, window reset, Vercel KV env detection, fallback to memory if Redis is down |
| Lead validation | Indian mobile normalisation, required fields, allowed values, length caps, honeypot |
| Lead storage | Postgres rows (in-memory PGlite in tests), a project per booking in one transaction, account linking by phone, IST timestamps, newest-first reading, fix-it messages for database errors |
| Customer accounts | SMS codes (hashing, expiry, 5 tries, single use), MSG91 request shape, sessions by bearer token or cookie, account deletion, every `/api/v1` account endpoint's envelope, errors, rate limits and `no-store` |
| Projects | Stages and the stepper, customers seeing only their own projects and never draft quotations, quotation versions, approval finalising the price |
| Leads API | Success returns no data, field errors, bot drop, cross-site block, body size limit, bad JSON, per-IP rate limit, no personal data in logs |
| Auth | scrypt hashing, tamper/expiry/forgery checks on sessions, cookie flags, generic errors (no username enumeration), lockout after 5 failures, cross-site block, logout, proxy redirect, server-side session check |
| SEO | Metadata, structured data, sitemap excludes private pages, robots rules |
| Frontend | Booking/contact forms (payload, errors, double-submit, honeypot), login form, leads table (counts, search, filters, HTML shown as text), header/footer links, FAQ, breadcrumbs, JSON-LD escaping, UTM capture |

## Security

- **Admin access:** each admin page and API checks the signed session on the server. A proxy redirects requests without a cookie first, but it isn't the access control on its own.
- **Sessions:** HMAC-SHA256 signed and expire after 8 hours. The cookie is `HttpOnly`, `SameSite=Strict`, and `Secure` with the `__Host-` prefix in production, so page scripts can't read it.
- **Login:** scrypt password hash and constant-time comparisons. The same error is shown for a wrong username or password. Locks out after 5 failed attempts per IP (30 site-wide) per 15 minutes.
- **No data leaks:** the lead form API never returns stored data; the account API returns only the signed-in customer's own account and projects (another customer's project is a plain 404). Lead data is only read on the server for a signed-in admin. Error responses are generic, logs never include personal details (only the development code line, with a masked number), and `/admin` and `/api` responses are `no-store` and `noindex`.
- **Customer sessions:** a random 256-bit token; the database keeps only its SHA-256. The website's cookie is `HttpOnly`, `SameSite=Lax` and `Secure` in production; cookie-signed changes must come from this site. Sign-in codes are HMAC-hashed with `SESSION_SECRET`, expire in 5 minutes, allow 5 tries and are rate-limited per number and per IP.
- **Request protection:** cross-site POSTs are rejected by an Origin check, request bodies are capped at 16 KB, inputs are validated with zod, and spam is limited by a honeypot field and a per-IP limit.
- **Headers:** Content Security Policy, HSTS (production), `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy, COOP/CORP, and a Permissions-Policy.
- **Injection:** React escapes everything shown on the page, JSON-LD escapes `<`, every database query is parameterised (Drizzle), and the admin CSV download prefixes formula-like cells so a spreadsheet shows them as text.
- **Secrets:** stored only in environment variables. `.env*` files are git-ignored, and `.env.local` is readable by your user account only.

**Known limit:** the Content Security Policy allows inline scripts, because Next.js needs them on statically generated pages.

## Deploying on Vercel

1. Push the project to GitHub, then **Add New → Project** in Vercel and import the repository. The Next.js settings are detected automatically.
2. Under **Settings → Environment Variables**, add the following for **Production** (and Preview if you want to test there):
   - `NEXT_PUBLIC_SITE_URL`: your domain, e.g. `https://www.yourdomain.in`
   - `DATABASE_URL`: the Supabase **Transaction pooler** string (port 6543). `DATABASE_URL_DIRECT` is only needed where you run `npm run db:migrate`.
   - `MSG91_AUTH_KEY`, `MSG91_OTP_TEMPLATE_ID`: for customer sign-in codes
   - `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`: from `npm run admin:hash`
   - `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_BING_SITE_VERIFICATION` (optional)
3. **Add Redis for rate limits (important):** in Vercel, open **Storage → Marketplace → Upstash for Redis** (free tier is fine) and connect it to the project. It sets `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically. Vercel runs the site on many serverless instances that don't share memory, so without Redis the login lockout and form spam limits only apply per instance.
4. Add your domain under **Settings → Domains**. HTTPS and HSTS are handled automatically.
5. After deploying, check that `/admin` asks for a password, submit a test booking, then confirm it appears on `/admin`.

**Handled automatically on Vercel:**
- The site URL falls back to the project's production URL if `NEXT_PUBLIC_SITE_URL` isn't set.
- **Preview deployments** are blocked from search engines (`robots.txt` disallows everything and an `X-Robots-Tag: noindex` header is sent), so they never compete with your real site.
- Production never falls back to the local development database: without `DATABASE_URL` it refuses to save (forms show an error, the API answers `503`), and `/admin` tells you which database setting is missing or wrong.
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
published shade, and Paint Saathi is not affiliated with these brands.

### No own shade codes

The site (then Paint Man) used to publish 167 shades of its own (PM-xxx codes, `/colours/PM-502` pages). They were
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

