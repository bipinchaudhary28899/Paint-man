# Paint Saathi app

The Paint Saathi mobile app for iOS and Android, built with Expo (SDK 58), TypeScript and Expo Router. It has every page and feature of paintsaathi.in, at the same paths, with the same facts and design system, laid out mobile-first (see "Mobile redesign" below).

- One stack of pages under `src/app/`, mirroring `src/app/(site)/` on the website: `/`, `/services`, `/services/<service>`, `/services/<service>/<city>`, `/services/house-painting`, `/services/house-painting/<city>`, `/colours`, `/palettes`, `/shade-cards`, `/shade-cards/<brand>`, `/shade-cards/<brand>/<family>`, `/gallery`, `/about`, `/faq`, `/contact`, `/book`, `/thank-you`, `/privacy-policy`, `/terms`, and the customer account: `/login`, `/account`, `/account/projects/<id>` (see "Accounts" below).
- Headings balance their lines as the website's `text-wrap: balance` does (`H` in `src/components/ui/Text.tsx`).
- Every page has a sticky header (the short "PS" logo, a "Log in" pill or, signed in, a round button with the customer's initials, and a menu button that opens the navigation drawer) and ends with the footer link hub. The drawer lists "Log in" or "My account" too. The phone nav sits over them: a charcoal bar of four tabs (Home, Services, Colours, Estimate) with depth, and the active tab's glossy colour dab sitting in a dip cut into the bar. On the home page the active tab follows the section in view.
- Links from the website's config (menus, footer, FAQ links, weather notes) open the app screen at the same path through `openHref` (`src/lib/links.ts`). A `#fragment` scrolls to that anchor on the page. Paths the app has no screen for (`/admin`) open on the website.

## Mobile redesign

Beyond the website's own phone layout, the app is tuned for a phone (owner's plan, three phases):

- **Phase 1:** pill buttons everywhere; a sticky "Book a free inspection" pill above the nav (it glides to the page's own booking form when there is one, hides over a form, near the top and while scrolling down; a WhatsApp or Call button joins it once `site.whatsapp` / `site.phone` are filled in); the navigation drawer (`site/Drawer.tsx`); a first-screen hero; booking in two steps (your details, then where to paint), with the city preselected on a city's pages.
- **Phase 2:** swipeable service cards (`services/ServiceCarousel.tsx`); one trust section (`home/Trust.tsx`); one painting journey stepper (`home/Journey.tsx`); a drag-to-compare colour preview on an example room (`colours/BeforeAfter.tsx`, on home and the gallery: labelled as a preview, never as one of our jobs); a native colour finder (brand pills and search pinned under the header, a three-column grid, the shade preview as a bottom sheet).
- **Phase 3:** motion (sections rise in as they scroll into view, the booking steps slide, accordions open smoothly; all off under reduce motion); skeleton loading states; footer accordions and "Back to top"; photos fetched at the size drawn and cached (`photoSource` in `src/lib/images.ts`); an automated accessibility audit of every screen and a WCAG contrast check (`tests/a11y/`); text that grows with the phone's text size; windowed shade-card grids and render-count tests (`tests/perf/`).

Bundled art that could be re-exported smaller for the app (the audit's finding; `public/` is the website's): `paint-can.webp` (drawn at about 264 px), `toolbox.webp` (about 720 px), `paint-brands.webp` (about 1080 px); the logo pack has no @3x files, so 3× phones load @4x.

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
npm run test:coverage   # 90% gate on src/** except the screens in src/app
```

The website's own checks (`npm run typecheck`, `npm run test:coverage`, `npm run build` in the repo root) leave `mobile/` alone: the root `tsconfig.json` excludes it, Vitest only matches `tests/**`, and Next never imports it.

## What the app shares with the website

Nothing is copied. [`src/shared.ts`](src/shared.ts) re-exports the website's own modules: `site.ts` (services, cities with `status`, localities, promises, FAQs, the work flow), `nav.ts` (menus, footer columns), `images.ts`, `gallery.ts`, `palettes.ts`, `scenes.ts`, `src/lib/leads/*` (the booking checks, options, date range, job estimate), `src/lib/colours/catalogue.ts` and `src/lib/projects/stages.ts` (the project stages' labels and explanations). Copy written inside a website page is reproduced word for word in the matching screen.

`@/` in `tsconfig.json` points at the website's `src` (so those files' own imports resolve), and `~/` points at the app's `src`. [`metro.config.js`](metro.config.js) watches those website folders and `../public/brand`, `../public/photos` and `../public/scenes`. The logo, illustrations, uniform photos and the room's wall mask are bundled from `../public`; Pexels stock photos load from Pexels.

The colour pages use the public JSON API under `/api/v1/` and its envelope: `/api/v1/colours/paint` and `/brands` for the finder, `/api/v1/palettes` (with each shade's LRV and closest Berger and Nerolac matches) for the palettes, and `/api/v1/colours/shade-cards`, `/shade-cards/{brand}` and `/shade-cards/{brand}/{family}` for the shade-card pages, which serve the website's own shade-card data and copy facts. The PaintDB attribution and licence link show wherever shades are shown.

The design tokens in [`src/theme.ts`](src/theme.ts) are the website's (`src/app/globals.css`). The building blocks in `src/components/ui` are its `.btn-*`, `.field`, `.card`, `.eyebrow`, `.pill`, `.sticker`, `.link-arrow` and `.swipe`. The ones in `src/components/site` are its header, footer, phone nav, `PageHero`, `Breadcrumbs`, `FaqList`, `Promises`, `WorkFlow`, `CtaBanner`, `BookingSection` and `LeadForm`.

## Accounts

Customers sign in with their mobile number and a 6-digit code sent by SMS, as on the website, through its account API (`/api/v1/auth/otp`, `/api/v1/auth/verify` with `client: "app"`, `/api/v1/me`, `/api/v1/projects`). Everything is in [`src/lib/auth.ts`](src/lib/auth.ts), [`src/lib/auth-context.tsx`](src/lib/auth-context.tsx) and [`src/lib/projects.ts`](src/lib/projects.ts); the screens are in `src/components/account/`.

- **Session:** the app session comes back as a bearer token (90 days). It is kept only in the phone's secure store (`expo-secure-store`, Keychain / Keystore) under one key, restored at launch and checked with `GET /api/v1/me` (offline, the session is kept and the account loads later), sent only as `Authorization: Bearer`, and never logged. Any 401 from the API deletes it and signs the app out at once.
- **`/login`:** the mobile number with "+91" as the booking form shows it, "Send code", then one field for the code (the phone offers it from the SMS: `oneTimeCode` / `sms-otp`; a complete code is checked at once) with a countdown before a new code. Refusals show the API's own words: a wrong code with the tries left, an expired code, too many tries with the wait, sign-in codes not set up yet. Afterwards the visitor goes back to the booking they were sending, to `?next=` (only the app's own screens), or to `/account`.
- **`/account`:** a greeting, the projects as cards (stage, what it means in the website's words from `src/lib/projects/stages.ts`, last update, the final price once agreed), with "Book a free inspection" when there are none; the name (editable) and verified number; log out; delete the account after a confirm step saying the bookings stay with us, unlinked.
- **`/account/projects/<id>`:** the tracker: where it stands and what happens next, the stages as a vertical stepper with dates, the inspection, the quotations newest first (status, itemised lines, totals in rupees from paise with Indian grouping, notes, payment terms, valid until), the agreed price highlighted, every update, and help (call or WhatsApp once `site.ts` has the numbers, else the contact page). **Download PDF** fetches `/api/v1/projects/{id}/quotations/{qid}/pdf` with the bearer token into the cache directory (`expo-file-system`) and opens the share sheet (`expo-sharing`, `application/pdf` / `com.adobe.pdf`) to open or save it.
- Signed out, `/account` and the tracker open the login screen and come back afterwards. `expo-secure-store`, `expo-file-system` and `expo-sharing` are in Expo Go.

To try it against the website's `npm run dev` (with `EXPO_PUBLIC_API_BASE=http://localhost:3000`), the sign-in code prints in the `next dev` terminal (`[dev OTP] ******3210 → 123456`) until MSG91 is set up.

## Bookings: sent once signed in

"Book my inspection" sends the booking to `POST /api/v1/bookings` with the session's bearer token: the website's booking fields from `toBookingPayload()` ([`src/lib/booking.ts`](src/lib/booking.ts)), with the map pin as `location` when one was confirmed. The thank-you page then says it is in, in the website's words, with "Track this booking" opening its project (`/thank-you?type=booking&sent=1&project=<id>`). Signed in, the form starts with the account's name and mobile number (the API takes bookings only for the verified number, and its message shows on the field if another is typed).

Signed out, the form checks the answers as the website does, keeps them in memory ([`src/lib/pending-booking.ts`](src/lib/pending-booking.ts), never on the phone's storage) and opens the login screen; once signed in, the booking is sent from the form without anything retyped. Leaving the login screen without signing in lets the held booking go (the form still has every answer). The API's field messages, the website's own, show on their fields; anything else (too many bookings with the wait, offline) shows as the form's line.

The contact form (and the waitlist note on a city coming soon) still only checks its answers: the website's `/api/leads` accepts same-origin requests only and there is no app endpoint for messages yet, so it opens the thank-you page saying plainly that nothing was sent and pointing to the website (`LEADS_ARE_SENT` in [`src/lib/leads.ts`](src/lib/leads.ts)).

## Location on the booking form

"Where to paint" starts with **Use my current location** and **Pick on the map** (`site/LocationPicker.tsx`, logic in `src/lib/location.ts`). Both open a full-screen map with a pin fixed at its centre: the visitor drags the map under the pin (it lifts while the map moves and drops when it stops; still under reduce motion) or taps a spot, and the address under the pin is looked up as the map settles. **Confirm this location** fills the address, locality, PIN code and, when the place is in a live city, the city; every field stays editable and typing the address works as before. A place outside the live cities shows the site's own "If your area is not listed…" line.

- Location permission (when in use only) is asked only when the visitor taps **Use my current location** (or **Locate me** on a map opened without it), never on load. Pick on the map opens over the chosen city without asking.
- The position is used only to fill the address and, as the booking's optional `location`, sent with it to the bookings endpoint. It is never logged or stored on the phone.
- Expo Go needs no key (iOS uses Apple Maps). An Android standalone build needs a Google Maps API key in the app config (the `react-native-maps` config plugin's `androidGoogleMapsApiKey`). On Android the geocoder needs location permission, so Pick on the map without it opens over India and asks the visitor to type the address.

## Not done yet

- App Store and Play Store release: EAS build profiles, signing and store listings. The bundle ID `in.paintsaathi.app` is a placeholder until the owner confirms it.
- An app endpoint for contact messages (the contact form and the waitlist note are checked, not sent).
- Live-site traffic from the app could meet Vercel's bot challenge, which blocks non-browser requests. Check it once the app has real users.
