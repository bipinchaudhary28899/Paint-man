# SEO: what only the owner can do

The code side of SEO is done in the repo. These steps need your accounts, your business details or your real work, and they matter more for local ranking than any further code change. Do them roughly in this order.

## 1. Own domain (done)

A `*.vercel.app` address can rank, but a real domain earns trust and links, and every canonical URL, the sitemap and the share images are built from it.

1. Done: **paintsaathi.in** is live (GoDaddy DNS points to Vercel, and `NEXT_PUBLIC_SITE_URL` is set). Keep `www.paintsaathi.in` and the old `paint-man-six.vercel.app` redirecting to it with **308 Permanent**.

## 2. Google Business Profile (the biggest local ranking factor)

The map results for "painters in Agra" come from Google Business Profile, not from the website.

1. Go to business.google.com and create the profile as **Paint Saathi**.
2. Primary category **Painter**; add **Painting contractor** if offered.
3. If customers do not visit an office, set it up as a *service-area business*: hide the street address and list the localities you serve (the same ones as on the site).
4. Hours: Monday to Saturday, 9 am to 7 pm (or your real hours; tell me if they differ).
5. Website: your domain. Phone: the number customers should call.
6. Complete verification (postcard, phone or video).
7. Add real photos of your jobs, and ask every customer for a Google review at the final walkthrough. Reply to every review.

## 3. Send me your business details

The site hides these until they exist; once filled they appear on the contact page, footer and in the structured data Google reads. Use exactly the same name, phone and address everywhere (Google Business Profile, Justdial, etc.).

| Field | Example |
| --- | --- |
| Phone (for calls) | +91 98XXX XXXXX |
| WhatsApp number | +91 98XXX XXXXX |
| Email | hello@yourdomain.in |
| Street address and PIN code | only if you want it public |
| Registered business name | as on GST / bank account |
| GSTIN | optional |
| Google Business Profile, Instagram, Facebook links | after step 2 |
| Map pin of the office or base | optional (latitude, longitude) |

Either send them to me or fill them in `src/config/site.ts`.

## 4. Google Search Console and Bing Webmaster Tools

1. search.google.com/search-console → **Add property** → *URL prefix* with your domain → choose **HTML tag** → copy only the `content="..."` value.
2. Vercel → Environment Variables → `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` = that value → redeploy → click **Verify**.
3. In Search Console → **Sitemaps** → submit `sitemap.xml`.
4. **URL inspection** → *Request indexing* for the home page, `/services`, the three service pages, `/colours` and `/areas`.
5. bing.com/webmasters → **Import from Google Search Console** (no extra code needed). If you prefer the meta-tag route, set `NEXT_PUBLIC_BING_SITE_VERIFICATION`.
6. Check Search Console weekly for the first month: *Pages* (indexing errors) and *Performance* (which searches show you).

## 5. Listings (citations)

Create free listings with the identical name, phone and address: Justdial, Sulekha, IndiaMART, Bing Places, Apple Business Connect, and Facebook. Link each to the website. Consistent listings are a local ranking signal.

## 6. Real photos and project write-ups

The site currently uses licensed stock photos, and the copy no longer claims they are your jobs. Real before/after photos are the strongest content you can add.

- For each finished job send me: 2 to 6 photos, the locality (for example Kamla Nagar), the room or surface, and the shade code used.
- I will add them as project entries with proper captions and alt text, which also lets each locality earn its own page honestly.

## 7. Things that unlock more pages

Tell me if any of these are true and I will add the pages:

- **Real rates** (per square foot, by paint range): a "painting cost in Agra" guide is one of the most-searched local topics.
- **Extra services you actually offer**: waterproofing, texture walls, wood polish, office or shop painting, society/apartment repainting.
- **Warranty or guarantee terms** you are willing to state publicly.

## 8. After the domain is live

- Run pagespeed.web.dev on the home page and `/colours` (mobile). Real-user Core Web Vitals appear in Search Console after about 28 days of traffic.
- Expect rankings to move over 4 to 12 weeks; reviews and the Business Profile move fastest.
