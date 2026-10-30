# Paint Saathi app

The Paint Saathi mobile app for iOS and Android, built with Expo (SDK 58), TypeScript and Expo Router. It has four tabs, the same as the website's phone nav:

- **Home**: the hero, promises, "We diagnose first", services, how the work gets done, cities and FAQs.
- **Services**: every service (what's included, the process, preparation and paint, price factors, timing, FAQs, each city's own notes) and every city (localities and weather notes; cities coming soon link to the waitlist on the website).
- **Colours**: the colour finder over the brands' shade cards, with the PaintDB credit.
- **Estimate**: booking a free inspection, with the same fields and checks as the website's `LeadForm`.

## Run it

You need Node 22 and Xcode with an iOS Simulator (or Android Studio with an emulator).

```bash
cd mobile
npm install
npm run ios          # or: npm run android
```

`npm run ios` starts Metro and opens the app in Expo Go on the booted simulator; Expo Go installs itself the first time. By default the app reads the live site (`https://paintsaathi.in`). To work against the website's `npm run dev` instead (the simulator reaches the Mac's localhost):

```bash
EXPO_PUBLIC_API_BASE=http://localhost:3000 npm run ios
```

Use the local server while developing, so testing never sends bursts of requests to the live site.

## Checks

```bash
npm run typecheck
npm test
npm run test:coverage   # 90% gate on src/lib, src/components and the rest of src outside src/app
```

The website's own checks (`npm run typecheck`, `npm run test:coverage`, `npm run build` in the repo root) leave `mobile/` alone: the root `tsconfig.json` excludes it, Vitest only matches `tests/**`, and Next never imports it.

## What the app shares with the website

Nothing is copied. [`src/shared.ts`](src/shared.ts) re-exports the website's own modules:

- services, `cities` with `status`, localities, promises, the work flow and FAQs from `src/config/site.ts`;
- the photos' and illustrations' alt text from `src/config/images.ts`;
- the booking checks, options, date range and job estimate from `src/lib/leads/*`.

`@/` in `tsconfig.json` points at the website's `src` (so those files' own imports resolve), and `~/` points at the app's `src`. [`metro.config.js`](metro.config.js) watches `../src/config`, `../src/lib/leads`, `../public/brand` and `../public/photos`. The logo, illustrations and uniform photos are bundled from `../public`; Pexels stock photos load from Pexels.

The colour finder uses the public JSON API (`GET /api/v1/colours/paint` and `/api/v1/colours/brands`) and its envelope. The PaintDB attribution and licence link from the response's `meta` show under the results and on every shade.

Call and WhatsApp buttons appear once `site.phone` / `site.whatsapp` are filled in `src/config/site.ts`. Both are empty today, so the buttons are hidden.

## Booking: stubbed for now

The website's `/api/leads` accepts same-origin requests only, so the app cannot post to it. Until an app endpoint is approved and built, **Book my inspection** checks the form exactly as the website would, then says plainly that nothing was sent and links to the website's booking page. Nothing is sent or stored (`BOOKINGS_ARE_SENT` in [`src/lib/booking.ts`](src/lib/booking.ts)).

Proposed endpoint (not built; needs the owner's OK):

```
POST /api/v1/bookings   (JSON, ≤ 10 KB)
Body: the LeadForm booking fields, checked by the same bookingSchema / field-checks
  name, phone, address, locality, pincode, city
  optional: service, propertyType, floors, homeSize, carpetArea, preferredDate, message
  website (honeypot), page: "app"
No same-origin check (an app sends no Origin). Bounded instead by:
  the same per-IP rateLimit as /api/leads, a JSON content type and body-size cap, the honeypot
201  kind "booking", label "Booking received. We call back Mon–Sat, 9 am to 7 pm."
     data { received: true, city }   (submitted personal data is never echoed)
400  invalid_request, details: { field: message }
413  too_large   415  unsupported_media_type   429  rate_limited   500  store_failed
All responses Cache-Control: no-store. Saved through saveLead. Doc comment and tests per status.
```

`toBookingPayload()` already builds that body. Wiring it up means one `fetch` in `submitBooking` and setting `BOOKINGS_ARE_SENT` to `true`.

## Design

The app follows the website's design system: cream canvas, ink text, terracotta buttons, golden, sage and sand (tokens in [`src/theme.ts`](src/theme.ts)). Headings are DM Serif Display with one italic accent word (`<Accent>`), and text is Manrope. Cards have hairline borders and soft radii, and standalone photos have sharp corners. There are no icons except the four tab icons in [`src/components/TabBar.tsx`](src/components/TabBar.tsx), the same drawings as the website's phone nav.

## Not done yet

- App Store and Play Store release: EAS build profiles, signing and store listings. The bundle ID `in.paintsaathi.app` is a placeholder until the owner confirms it.
- The booking endpoint above.
- Previewing a shade on the room photo, as the website's finder does.
- Android has not been run on an emulator yet; only iOS has been checked.
- Live-site traffic from the app could meet Vercel's bot challenge, which blocks non-browser requests. Check it once the app has real users.
