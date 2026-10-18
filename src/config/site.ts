import { crewEstimate, PAINT_AREA_PER_CARPET_SQFT, SQFT_PER_PAINTER_DAY } from "@/lib/leads/estimate";
import type { serviceTypes } from "@/lib/leads/options";
import type { Room } from "./colours";
import { images, type SiteImage } from "./images";

// Central business details. Fill the TODO fields before launch: they feed the
// header, footer, contact page and the LocalBusiness schema Google reads.
// Empty values are hidden from the page and left out of structured data.

export const site = {
  name: "Paint Man",
  legalName: "", // TODO: registered business name
  tagline: "Managed home painting in Agra",
  city: "Agra",
  region: "Uttar Pradesh",
  regionCode: "IN-UP",
  country: "IN",
  // Your domain. On Vercel it falls back to the project's production URL.
  url: (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`) ||
    "http://localhost:3000"
  ).replace(/\/$/, ""),
  locale: "en_IN",

  phone: "", // TODO: e.g. "+919XXXXXXXXX" (E.164, no spaces)
  phoneDisplay: "", // TODO: e.g. "+91 9XXXX XXXXX"
  whatsapp: "", // TODO: digits only with country code, e.g. "919XXXXXXXXX"
  email: "", // TODO
  address: {
    street: "", // TODO
    locality: "Agra",
    postalCode: "", // TODO
  },
  hours: "Mo-Sa 09:00-19:00",
  hoursDisplay: "Monday to Saturday, 9 am to 7 pm",

  // Keep this list to the localities you can actually serve and supervise.
  areas: [
    "Kamla Nagar",
    "Dayalbagh",
    "Sikandra",
    "Sanjay Place",
    "Shastripuram",
    "Tajganj",
    "Fatehabad Road",
    "Civil Lines",
    "Khandari",
    "Balkeshwar",
  ],

  social: [] as string[], // TODO: Google Business Profile, Instagram, Facebook URLs
} as const;

/** One question and answer. `link` is shown after the answer; FAQPage JSON-LD uses only `q` and `a`. */
export type FaqItem = { q: string; a: string; link?: { href: string; label: string } };

/** A titled paragraph: a preparation layer or a cost factor. */
export type ServicePoint = { title: string; body: string };

export type Service = {
  slug: string;
  image: SiteImage;
  accent: string;
  name: string;
  shortName: string;
  /** Page title and h1, "{Topic} in Agra": the root template adds " | Paint Man". */
  title: string;
  description: string;
  intro: string;
  /** The matching choice in the booking form's "Service needed" list. */
  leadService: (typeof serviceTypes)[number];
  includes: string[];
  suitableFor: string[];
  /** How the job runs, in order. */
  process: { step: string; detail: string }[];
  /** Surface preparation and the paint system, layer by layer. */
  paintSystem: ServicePoint[];
  /** What moves the price. Never figures: the quotation itemises each one. */
  costFactors: ServicePoint[];
  /** How long it takes, as paragraphs. */
  timeline: string[];
  /** Worked crew examples from the rule of thumb in src/lib/leads/estimate.ts (interior work only). */
  sizeExamples?: { home: string; carpetArea: number }[];
  /** Aftercare and cleanup. */
  aftercare: string[];
  /** Palette slugs from src/config/palettes.ts, and an optional room filter for the shade finder. */
  shades: { intro: string; palettes: string[]; room?: Room };
  faqs: FaqItem[];
};

/**
 * Walls + ceilings and the planned crew for a home of this carpet area (one floor), using the
 * same rule of thumb as the booking form. Rough sizing only: the inspector measures on site.
 */
export function jobSize(carpetArea: number) {
  const paintArea = Math.round((carpetArea * PAINT_AREA_PER_CARPET_SQFT) / 10) * 10;
  return { carpetArea, paintArea, ...crewEstimate(paintArea) };
}

const sqft = (n: number) => `${n.toLocaleString("en-IN")} sq ft`;
const twoBhk = jobSize(900);
const rule = `one painter covers about ${SQFT_PER_PAINTER_DAY} sq ft a day through putty, primer and two coats`;

export const services: Service[] = [
  {
    slug: "interior-painting",
    image: images.livingTeal,
    accent: "bg-terracotta text-on-ink",
    name: "Interior Painting",
    shortName: "Interior",
    title: "Interior Wall Painting Services in Agra",
    description:
      "Interior wall painting in Agra without managing painters yourself. On-site inspection, itemised quotation and branded paint, with a supervised crew.",
    intro:
      "Repaint bedrooms, living rooms, kitchens and ceilings without managing painters yourself. We inspect your walls, give you an itemised quote and supervise the job until the final walkthrough.",
    leadService: "Interior Painting",
    includes: [
      "On-site inspection and wall measurement",
      "Surface preparation: crack filling, putty and sanding as quoted",
      "Primer and finish coats with the paint brand and range you approve",
      "Furniture, floor and fitting protection",
      "Daily site supervision and photo updates",
      "Cleanup and final walkthrough with you",
    ],
    suitableFor: ["Flats and apartments", "Independent houses", "Single rooms or full homes", "Shops and small offices", "Pre-festival repainting"],
    process: [
      {
        step: "Inspection and measurement",
        detail:
          "An inspector visits, measures every wall and ceiling, and notes cracks, damp patches, flaking paint and old putty. Shade cards come to the visit, so you can compare colours on your own walls.",
      },
      {
        step: "Itemised quotation",
        detail:
          "The written quote lists each room, the area, the preparation, the paint brand, range and finish, the number of coats, what is excluded and the payment schedule. Work is scheduled only after you approve it.",
      },
      {
        step: "Protection",
        detail:
          "On the first day the crew moves furniture to the centre of each room and covers it, along with floors, switches and fittings, before any sanding starts.",
      },
      {
        step: "Surface preparation",
        detail: "Cracks are opened and filled, loose paint is scraped off, and putty and sanding are done to the level written in your quote.",
      },
      {
        step: "Primer and finish coats",
        detail: "Primer goes on first, then the finish coats in the brand and shade you approved, with drying time left between coats.",
      },
      {
        step: "Supervision and photo updates",
        detail: "A supervisor checks the work every day and you get photo updates, so you know where the job stands without standing over the painters.",
      },
      {
        step: "Cleanup and walkthrough",
        detail: "Covers, tape and debris are cleared, paint spots are cleaned off floors and fittings, and we walk through every room with you before the job is closed.",
      },
    ],
    paintSystem: [
      {
        title: "Crack filling",
        body: "Hairline and settlement cracks are cut open and filled so they do not show through the new paint. Wide or recurring cracks and seepage are pointed out at the inspection rather than painted over.",
      },
      {
        title: "Wall putty",
        body: "Putty fills dents and pores in the plaster. A wall in good condition may need only spot putty; an old or uneven wall usually needs one or two full coats, each sanded smooth. Your quote says which your walls get.",
      },
      {
        title: "Primer",
        body: "Primer seals the plaster or putty so the finish coat grips and dries to an even colour. Deep shades go over a tinted primer, which helps the colour cover properly.",
      },
      {
        title: "Finish coats",
        body: "Two coats of interior emulsion over primer is the usual finish. Matt hides small wall flaws; washable and sheen finishes wipe clean and suit kitchens, kids' rooms and passages.",
      },
    ],
    costFactors: [
      { title: "Paintable area", body: "Walls and ceilings are measured on site. As a rule of thumb they add up to about 3 to 3.5 times your carpet area." },
      { title: "Wall condition", body: "Damp patches, cracks, flaking or many old layers of paint need more preparation, putty and sanding time." },
      { title: "Paint range and finish", body: "Every brand sells several ranges. The one you choose changes the price, how washable the wall is and how long the finish lasts." },
      { title: "Coats and colour change", body: "Going from a dark colour to a light one, or adding a deep feature wall, can need a tinted primer or an extra finish coat." },
      { title: "Height and access", body: "High ceilings, stairwells and double-height walls need taller ladders or scaffolding and take longer to paint." },
      { title: "Extras", body: "Doors, window frames and grilles, if you want them painted, are listed as separate line items so you can include or leave them out." },
    ],
    timeline: [
      `As a rule of thumb, the walls and ceilings inside a home add up to about 3 to 3.5 times its carpet area, and ${rule}. Crews are sized so most full-home jobs take about a week of working days, as the examples below show.`,
      "Walls in good condition need less putty and go faster; heavy crack repair, damp patches or deep shades add time. Your quotation states the expected duration before you approve it, and you can usually keep living at home while rooms are done in turn.",
    ],
    sizeExamples: [
      { home: "2 BHK", carpetArea: 900 },
      { home: "3 BHK", carpetArea: 1300 },
    ],
    aftercare: [
      "Keep windows open for a day or two after the last coat. Water-based emulsions dry quickly, but the smell takes a little longer to clear.",
      "Do not scrub or wash new walls for the first few weeks while the paint cures; dust them with a dry cloth instead.",
      "Wait a few days before fixing frames or pushing furniture tight against freshly painted walls.",
      "Keep your quotation. It lists the brand, range and shade codes, so a touch-up or a future repaint matches.",
    ],
    shades: {
      intro:
        "Most rooms work best with one colour on a feature wall and a matching white on the other walls and ceiling. Start from a ready palette, open any shade for its code and room photos, or try it on a photo of your own room in the visualizer.",
      palettes: ["calm-bedroom", "sunny-living-room", "earthy-living-room", "kids-room-pista"],
    },
    faqs: [
      {
        q: "How long does interior painting take for a 2BHK in Agra?",
        a: "Most 2BHK repainting jobs take 4 to 7 working days depending on wall condition, putty work and the number of coats. Your quotation states the expected duration before you approve it.",
      },
      {
        q: "Do I need to move my furniture out?",
        a: "No. Our team moves furniture to the centre of the room and covers furniture, floors and fittings before work begins.",
      },
      {
        q: "Can I choose the paint brand?",
        a: "Yes. The quotation lists the exact brand, product range and finish. If a product ever needs to change, we ask for your approval first.",
      },
      {
        q: "Can we stay at home while the rooms are painted?",
        a: "Usually, yes. The crew can work room by room, so you keep using the rest of the home. We agree the order of rooms with you before work starts.",
      },
      {
        q: "Will the house smell of paint?",
        a: "Water-based interior emulsions have a mild smell that clears within a day or two with the windows open. Tell the inspector if someone at home is sensitive to it.",
      },
    ],
  },
  {
    slug: "exterior-painting",
    image: images.exteriorTerracotta,
    accent: "bg-sage-deep text-on-ink",
    name: "Exterior Painting",
    shortName: "Exterior",
    title: "Exterior House Painting Services in Agra",
    description:
      "Exterior house painting in Agra that stands up to sun, dust and monsoon. Crack repair, weatherproof coats and an itemised quote after a site inspection.",
    intro:
      "Agra's summer heat, dust and monsoon take a toll on outer walls. We inspect the exterior, repair cracks where needed and apply weather-resistant coatings with a clear, itemised quote.",
    leadService: "Exterior Painting",
    includes: [
      "Inspection of walls, cracks, dampness and existing paint",
      "Cleaning, scraping and crack repair as quoted",
      "Exterior primer and weather-resistant finish coats",
      "Safe access arrangements for upper floors",
      "Site supervision and progress updates",
      "Debris removal and final inspection",
    ],
    suitableFor: ["Independent houses and kothis", "Boundary walls and gates", "Small commercial buildings", "Rental properties"],
    process: [
      {
        step: "Inspection",
        detail:
          "The inspector checks every face of the building, the parapet and the boundary wall for cracks, damp patches, algae, chalky or peeling paint, and notes what access the upper floors need.",
      },
      {
        step: "Itemised quotation",
        detail: "Area, repairs, primer, the exterior paint range and finish, coats, access and exclusions are listed line by line. Work is scheduled only after you approve it.",
      },
      {
        step: "Planning around the weather",
        detail: "Exterior paint needs dry walls and dry days, so the job is planned for a dry spell and paused when heavy rain is due, keeping moisture out from under the new coat.",
      },
      {
        step: "Cleaning and repair",
        detail: "Walls are brushed or washed down, loose and flaking paint is scraped off, and cracks are filled and left to set before any primer goes on.",
      },
      {
        step: "Primer and weatherproof coats",
        detail: "Exterior primer goes on first, then the weather-resistant finish coats in the shade you approved.",
      },
      {
        step: "Protection and supervision",
        detail: "Windows, floors and anything close to the walls are covered, and a supervisor checks progress and sends you updates.",
      },
      {
        step: "Cleanup and final inspection",
        detail: "Scrapings, debris and covers are cleared from the site, and you inspect the finished walls with us.",
      },
    ],
    paintSystem: [
      {
        title: "Cleaning",
        body: "Dust, soot, algae and loose paint stop new paint from sticking, so every wall is cleaned and scraped back to a sound surface first.",
      },
      {
        title: "Crack repair",
        body: "Fine cracks are filled with exterior crack filler. Wider cracks and gaps around window frames are opened up and filled so rainwater cannot get behind the paint.",
      },
      {
        title: "Exterior primer",
        body: "A primer made for outside masonry seals the surface and helps the top coat grip. Interior wall putty is not used outside, because it is not made to take rain.",
      },
      {
        title: "Weatherproof finish coats",
        body: "Two coats of exterior emulsion is the usual system. Exterior paints are made to resist sun, rain and dust; ordinary interior emulsion chalks on an outside wall within a summer.",
      },
    ],
    costFactors: [
      { title: "Wall area and height", body: "Facades, parapets and boundary walls are measured on site. On an exterior, height matters as much as area." },
      { title: "Access", body: "Upper floors need ladders or scaffolding set up safely, which adds time and is listed on the quote." },
      { title: "Surface condition", body: "Peeling paint, algae, wide cracks and damp patches need more cleaning and repair before any paint goes on." },
      { title: "Paint range", body: "Exterior ranges differ in how well they resist fading, dirt and rain. The quote names the exact product you are paying for." },
      { title: "Coats and colour change", body: "Bare plaster, or a change from a dark colour to a light one, may need an extra coat." },
      { title: "Extras", body: "Gates, grilles and boundary walls are listed separately, so you can include them or leave them out." },
    ],
    timeline: [
      "Exterior walls are measured on site rather than estimated from carpet area, because height, parapets and boundary walls vary so much from house to house.",
      "The job runs in stages: cleaning and crack repair, time for repairs to set, then primer and finish coats. Dry weather matters more than crew size, so your quotation states the expected duration, and rainy days can push it out. In Agra the dry months, roughly October to March, are the best window.",
    ],
    aftercare: [
      "Give fresh exterior paint a few dry days to cure, and avoid hosing the walls down for the first few weeks.",
      "Fix leaking pipes, overflowing tanks and AC drain lines that run down the walls; water running down a wall is a common cause of early stains.",
      "Keep your quotation for the shade codes and product names, for touch-ups or the next repaint.",
      "Debris, scrapings and covers are cleared from the site before the final inspection.",
    ],
    shades: {
      intro:
        "Outside walls face strong sun and plenty of dust. Stone and warm beige shades hide dust better than bright white, with a white or a deeper accent on bands, gates and doors. Each shade below opens with its code; browse the finder for every exterior shade.",
      palettes: ["agra-stone-exterior", "blue-door-exterior"],
      room: "Exterior",
    },
    faqs: [
      {
        q: "When is the best time for exterior painting in Agra?",
        a: "Dry months, roughly October to March, are best. We avoid applying exterior paint during heavy rain because moisture affects adhesion and finish.",
      },
      {
        q: "Do you fix cracks before painting?",
        a: "Yes. Crack filling and surface repairs found during the inspection are listed separately in your quotation so you can see what each costs.",
      },
      {
        q: "Will painting fix damp patches on outside walls?",
        a: "Not on its own: paint over a wet wall peels. The inspector looks for the likely source, such as a cracked parapet or a leaking pipe, and notes it so it can be fixed before painting.",
      },
      {
        q: "Can you paint the boundary wall and gate too?",
        a: "Yes. Boundary walls, gates and grilles are listed as separate items on the quotation, so you can include them or leave them out.",
      },
    ],
  },
  {
    slug: "rental-property-painting",
    image: images.livingWhite,
    accent: "bg-golden text-ink",
    name: "Rental Property Painting",
    shortName: "Rental",
    title: "Rental Property and PG Painting in Agra",
    description:
      "Repaint rental flats, houses and PGs in Agra between tenants without visiting the site. Supervised painters, photo updates and one itemised quotation.",
    intro:
      "Repaint between tenants without visiting the site every day. We handle inspection, painting and cleanup, and send you photo updates so the property is ready to let again quickly.",
    leadService: "Rental Property",
    includes: [
      "Inspection, including when you are not present",
      "Economy and standard paint options",
      "Fast scheduling between tenancies",
      "Photo updates through the job",
      "Invoice with GST details where applicable",
    ],
    suitableFor: ["Landlords", "PG and hostel owners", "Property managers", "Owners living outside Agra"],
    process: [
      {
        step: "Inspection, with or without you",
        detail: "Keys can be collected by arrangement. The inspector checks every room, notes marks, nail holes, stains and damp patches, and sends you the inspection photos.",
      },
      {
        step: "Quotation online",
        detail: "The itemised quote comes to you online, with the paint range for each room. You can pick economy or standard paint to match the property and the rent.",
      },
      {
        step: "Scheduling between tenancies",
        detail: "Tell us when the old tenant leaves and when the new one moves in, and the job is planned to fit that gap.",
      },
      {
        step: "Patch, prime and paint",
        detail: "Nail holes, scuffs and small cracks are filled, repaired spots and stains are primed so they do not show through, and the walls get the coats on the quote.",
      },
      {
        step: "Photo updates",
        detail: "You get progress photos through the job, so there is no need to visit the property.",
      },
      {
        step: "Cleanup and handover",
        detail: "Covers and debris are cleared, you get closing photos of each room, keys are returned the way you arranged, and the invoice shows GST details where applicable.",
      },
    ],
    paintSystem: [
      {
        title: "Refresh over sound paint",
        body: "If the existing paint is sound and the colour stays the same or close, one finish coat after spot repairs is often enough. The inspector tells you where it is not.",
      },
      {
        title: "Spot putty and primer",
        body: "Nail holes, scuffs and small cracks get spot putty, sanded flush, then primer on the repaired spots so they do not show as dull patches under the new coat.",
      },
      {
        title: "Stains",
        body: "Water marks, smoke and grease stains bleed through ordinary emulsion, so they are primed before the finish coat goes on.",
      },
      {
        title: "Full repaint where needed",
        body: "Flaking paint, damp damage or a big colour change needs the full system: putty, primer and two finish coats, the same as a home repaint.",
      },
    ],
    costFactors: [
      { title: "Refresh or full repaint", body: "One coat over sound walls needs far less material and labour than putty, primer and two coats. The inspection decides which each room needs." },
      { title: "Paint range", body: "Economy paint keeps the cost down for frequent turnovers; a standard washable range lasts longer in kitchens and wipes clean between tenants." },
      { title: "Condition after the tenancy", body: "Nail holes, stains, damp patches and damaged corners add preparation time." },
      { title: "Rooms and area", body: "Everything is measured on site, and ceilings, kitchens and bathrooms can be included or left out room by room." },
    ],
    timeline: [
      `A full repaint follows the same crew rule as a family home: ${rule}. The examples below are for a full repaint.`,
      "A refresh over sound paint skips most of the putty and a coat, so it takes noticeably less time than a full repaint of the same flat. Your quotation states the expected duration, so you can line it up with the next move-in date.",
    ],
    sizeExamples: [
      { home: "1 BHK", carpetArea: 550 },
      { home: "2 BHK", carpetArea: 900 },
    ],
    aftercare: [
      "Leave the windows open for a day before new tenants move in, so the paint smell clears.",
      "Ask tenants not to stick tape or hooks on fresh walls for the first few weeks while the paint cures.",
      "Keep the quotation: the shade codes and products on it make the next turnover a quick match.",
      "A neutral, washable white makes the next refresh quicker, because touch-ups blend in.",
    ],
    shades: {
      intro:
        "Neutral whites and light greys suit any tenant's furniture and make touch-ups between tenancies easy to match. Washable finishes in kitchens and passages keep the next refresh small.",
      palettes: ["rental-refresh"],
      room: "Rental refresh",
    },
    faqs: [
      {
        q: "Can you paint the property if I live outside Agra?",
        a: "Yes. We can collect keys by arrangement, share inspection photos and the quotation online, and send progress photos until the job is complete.",
      },
      {
        q: "Is one coat enough between tenants?",
        a: "Often, if the existing paint is sound and the colour stays the same. The inspector checks each room and tells you where a full repaint is needed instead.",
      },
      {
        q: "Can the job fit before my next tenant moves in?",
        a: "Tell us the move-in date when you book. The quotation states the expected duration, and the job is scheduled to fit the gap between tenancies wherever possible.",
      },
      {
        q: "Will I get an invoice for my property accounts?",
        a: "Yes. You get an invoice for the job, with GST details where applicable.",
      },
    ],
  },
];

export function getService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

export const generalFaqs: FaqItem[] = [
  {
    q: "How does booking work?",
    a: "Book an inspection online or by phone. We visit your property, measure the walls and note their condition, then send an itemised quotation. Work is scheduled only after you approve the quote.",
    link: { href: "/book", label: "Book an inspection" },
  },
  {
    q: "Which areas of Agra do you serve?",
    a: `We currently serve ${site.areas.join(", ")}. If your area is not listed, book anyway and we will confirm whether we can serve you.`,
    link: { href: "/areas", label: `See the areas we serve in ${site.city}` },
  },
  {
    q: "How is the price calculated?",
    a: `Price depends on the measured wall area, surface condition, preparation needed, paint brand and range, and the number of coats. As a rule of thumb, the walls and ceilings inside a home add up to about 3 to 3.5 times its carpet area, so a 2 BHK with ${sqft(twoBhk.carpetArea)} of carpet area has roughly ${sqft(twoBhk.paintArea)} to paint. ${rule[0].toUpperCase()}${rule.slice(1)}, so that home is about ${twoBhk.painterDays} painter-days of work: usually a crew of ${twoBhk.painters} for about ${twoBhk.days} working days. The inspector measures exactly on site, and the quotation lists each item, what is included and excluded, and the payment schedule.`,
    link: { href: "/services", label: "See what each service includes" },
  },
  {
    q: "Are you painters or a platform?",
    a: "We are a managed painting service. We assign and supervise vetted painting teams and stay responsible for the job from inspection to the final walkthrough, so you have one point of contact.",
    link: { href: "/about", label: "How we work" },
  },
  {
    q: "What happens if I want extra work during the job?",
    a: "Any change, such as an extra room or a different paint, is priced and approved by you in writing before that work starts.",
    link: { href: "/contact", label: "Ask us about your job" },
  },
];
