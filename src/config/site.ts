import { crewEstimate, PAINT_AREA_PER_CARPET_SQFT, SQFT_PER_PAINTER_DAY } from "@/lib/leads/estimate";
import type { serviceTypes } from "@/lib/leads/options";
import { images, type SiteImage } from "./images";

// Central business details. Fill the TODO fields before launch: they feed the
// header, footer, contact page and the LocalBusiness schema Google reads.
// Empty values are hidden from the page and left out of structured data.

export const site = {
  name: "Paint Saathi",
  legalName: "", // TODO: registered business name
  tagline: "har ghar ka paint saathi",
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

/**
 * The anchor id of a locality on /areas: the name lower-cased with every run of other characters
 * turned into one hyphen ("Fatehabad Road" → "fatehabad-road"). The /areas page gives each
 * locality this id and the home page's "Painters in {area}" links point at it, so both use this.
 */
export function areaSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** One question and answer. `link` is shown after the answer; FAQPage JSON-LD uses only `q` and `a`. */
export type FaqItem = { q: string; a: string; link?: { href: string; label: string } };

/** A titled paragraph: a preparation layer or a cost factor. */
export type ServicePoint = { title: string; body: string };

/** What a service page says for one city: /services/<service>/<city>. Written for that city only. */
export type ServiceLocal = {
  /** 140–155 characters, naming the city. */
  description: string;
  intro: string;
  /** What is different about this work in this city: weather, seasons, the way homes are built or let. */
  notes: ServicePoint[];
  /** Questions that only make sense for this city (marked up on the city page, nowhere else). */
  faqs: FaqItem[];
};

export type Service = {
  slug: string;
  image: SiteImage;
  accent: string;
  name: string;
  shortName: string;
  /** The service hub's title and h1 with no city ("Interior Wall Painting Services"); a city page adds " in {City}". */
  title: string;
  /** The hub's description and intro, true in every city. */
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
  /** Palette slugs from src/config/palettes.ts, shown with their brand shade-card codes. */
  shades: { intro: string; palettes: string[] };
  /** Questions true in every city (marked up on the hub). */
  faqs: FaqItem[];
  /** Per-city copy, keyed by city slug. A service appears in a city only when it has an entry. */
  local: Record<string, ServiceLocal>;
};

/**
 * How long a job of this many working days is said to take, in the one wording every page uses.
 * Crews are sized for jobs of about a week (src/lib/leads/estimate.ts), so 5 to 8 working days
 * reads "about a week"; only a job the crew rule cannot fit into about a week gets its own number.
 */
export function jobDuration(days: number): string {
  if (days >= 5 && days <= 8) return "about a week";
  return days === 1 ? "about 1 working day" : `about ${days} working days`;
}

/**
 * Walls + ceilings and the planned crew for a home of this carpet area (one floor), using the
 * same rule of thumb as the booking form. Rough sizing only: the inspector measures on site.
 */
export function jobSize(carpetArea: number) {
  const paintArea = Math.round((carpetArea * PAINT_AREA_PER_CARPET_SQFT) / 10) * 10;
  const crew = crewEstimate(paintArea);
  return { carpetArea, paintArea, ...crew, duration: jobDuration(crew.days) };
}

const sqft = (n: number) => `${n.toLocaleString("en-IN")} sq ft`;
const twoBhk = jobSize(900);
const rule = `one painter covers about ${SQFT_PER_PAINTER_DAY} sq ft a day through putty, primer and two coats`;

export const services: Service[] = [
  {
    slug: "interior-painting",
    image: images.livingRoom,
    accent: "bg-terracotta text-on-ink",
    name: "Interior Painting",
    shortName: "Interior",
    title: "Interior Wall Painting Services",
    description:
      "Interior wall painting without managing painters yourself: on-site inspection, an itemised quote, branded paint and a supervised crew to the walkthrough.",
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
      `As a rule of thumb, the walls and ceilings inside a home add up to about 3 to 3.5 times its carpet area, and ${rule}. The crew is sized to the home, so a full repaint of one floor in most homes takes about a week: a bigger home gets more painters (up to eight) rather than more days, as the examples below show.`,
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
        "Most rooms work best with one colour on a feature wall and a matching white on the other walls and ceiling. Start from a ready palette, or look any shade up by its Asian Paints code in the colour finder and see it on a room before the inspector brings the shade cards.",
      palettes: ["calm-bedroom", "sunny-living-room", "earthy-living-room", "kids-room-pista"],
    },
    faqs: [
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
    local: {
      agra: {
        description:
          "Interior wall painting in Agra without managing painters yourself. On-site inspection, itemised quotation and branded paint, with a supervised crew.",
        intro:
          "Repaint bedrooms, living rooms, kitchens and ceilings in Agra without managing painters yourself. An inspector visits your home, you get an itemised quote, and a supervisor stays on the job until the final walkthrough.",
        notes: [
          {
            title: "Dust and summer heat",
            body: "Agra summers are long, hot and dusty, and fine dust settles on walls in every room. A washable finish in living rooms, kitchens and kids' rooms lets you wipe marks off without scrubbing the colour away, while matt hides small plaster flaws in older homes.",
          },
          {
            title: "Monsoon damp",
            body: "Monsoon humidity shows up as damp patches beside bathrooms, kitchens and outer walls. The inspector checks for seepage before quoting, because paint over a damp wall peels; the cause is noted so it can be fixed first.",
          },
          {
            title: "Festive season",
            body: "Many families repaint before Diwali and weddings, when painters are busiest. Booking the inspection a few weeks ahead leaves time to pick shades and approve the quote before the dates you want.",
          },
        ],
        faqs: [
          {
            q: "How long does interior painting take for a 2BHK in Agra?",
            a: `A full repaint of a 2 BHK takes ${twoBhk.duration} with a crew sized to the job, usually ${twoBhk.painters} painters, and less when the walls need little putty work. Heavy crack repair, damp patches or deep shades add time. Your quotation states the expected duration before you approve it.`,
          },
          {
            q: "When should I book interior painting before Diwali in Agra?",
            a: "A few weeks before you want the work done. The inspection, the quotation and your approval come first, and the quotation states the expected duration, so the job can be planned around your dates.",
          },
        ],
      },
      mathura: {
        description:
          "Interior wall painting in Mathura without chasing painters yourself: an on-site inspection, an itemised quote, branded paint and a supervised crew.",
        intro:
          "Repaint bedrooms, living rooms, kitchens and pooja rooms in Mathura without managing painters yourself. An inspector visits, you get an itemised quote, and a supervisor stays on the job until the final walkthrough.",
        notes: [
          {
            title: "Before Janmashtami and Diwali",
            body: "Many Mathura families repaint before Janmashtami and Diwali, the busiest weeks for painters. Booking the inspection a few weeks early leaves time to choose shades and approve the quote before your dates.",
          },
          {
            title: "Pooja rooms and kitchens",
            body: "Pooja rooms and kitchens collect smoke from diyas, agarbatti and cooking. A washable finish lets soot be wiped off, and the inspector checks for oily patches that need cleaning before the first coat.",
          },
          {
            title: "Damp in the monsoon",
            body: "Walls beside bathrooms, and outer walls, take on damp in the monsoon. The inspector checks for seepage before quoting, so the cause can be fixed before any paint goes on.",
          },
        ],
        faqs: [
          {
            q: "How long does interior painting take for a 2BHK in Mathura?",
            a: `A full repaint of a 2 BHK in Mathura takes ${twoBhk.duration} with a crew sized to the job, usually ${twoBhk.painters} painters. Heavy crack repair, damp patches or deep shades add time, and your quotation states the expected duration before you approve it.`,
          },
          {
            q: "Can you paint just the pooja room in our Mathura home?",
            a: "Yes. A single room is a job on its own, with the same inspection and itemised quote. Tell the inspector which days suit your family; the floor and furniture are covered, and the room is cleaned when the work is done.",
          },
        ],
      },
      vrindavan: {
        description:
          "Interior wall painting in Vrindavan for homes and rented flats: an on-site inspection, a line-by-line quote, genuine branded paint and supervised painters.",
        intro:
          "Repaint bedrooms, living rooms, kitchens and pooja rooms in Vrindavan, from the parikrama lanes to the colonies on Chhatikara Road. An inspector visits first, the quote is itemised, and a supervisor checks every stage.",
        notes: [
          {
            title: "Calm colours for pooja rooms",
            body: "Many Vrindavan homes keep a pooja room or a shrine corner. Soft whites, creams and pale yellows keep it bright, and a washable finish lets diya soot be wiped off without marking the colour.",
          },
          {
            title: "Dust from busy lanes",
            body: "Homes on busy lanes and near the temples get a lot of street dust. Walls are cleaned before primer, and furniture and floors stay covered until the last coat is dry.",
          },
        ],
        faqs: [
          {
            q: "How long does interior painting take for a 2BHK in Vrindavan?",
            a: `A full 2 BHK repaint in Vrindavan takes ${twoBhk.duration}, usually with ${twoBhk.painters} painters, and less when the walls need little putty. Your quotation states the expected duration before you approve it.`,
          },
          {
            q: "Do you paint homes inside the parikrama lanes in Vrindavan?",
            a: "Yes. Narrow lanes are fine for interior work: the inspector plans how materials reach the house and notes it in the quotation, so nothing changes once work starts.",
          },
        ],
      },
    },
  },
  {
    slug: "exterior-painting",
    image: images.houseFront,
    accent: "bg-sage-deep text-on-ink",
    name: "Exterior Painting",
    shortName: "Exterior",
    title: "Exterior House Painting Services",
    description:
      "Exterior house painting that stands up to sun, dust and monsoon: crack repair, primer and weatherproof coats, and an itemised quote after a site visit.",
    intro:
      "Summer heat, dust and the monsoon take a toll on outer walls. We inspect the exterior, repair cracks where needed and apply weather-resistant coatings with a clear, itemised quote.",
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
      "The job runs in stages: cleaning and crack repair, time for repairs to set, then primer and finish coats. Dry weather matters more than crew size, so your quotation states the expected duration, and rainy days can push it out.",
    ],
    aftercare: [
      "Give fresh exterior paint a few dry days to cure, and avoid hosing the walls down for the first few weeks.",
      "Fix leaking pipes, overflowing tanks and AC drain lines that run down the walls; water running down a wall is a common cause of early stains.",
      "Keep your quotation for the shade codes and product names, for touch-ups or the next repaint.",
      "Debris, scrapings and covers are cleared from the site before the final inspection.",
    ],
    shades: {
      intro:
        "Outside walls face strong sun and plenty of dust. Stone and warm beige shades hide dust better than bright white, with a white or a deeper accent on bands, gates and doors. Each shade below is an Asian Paints shade-card code that opens in the colour finder, beside the shade cards of Berger, Nerolac and other brands.",
      palettes: ["agra-stone-exterior", "blue-door-exterior"],
    },
    faqs: [
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
    local: {
      agra: {
        description:
          "Exterior house painting in Agra that stands up to sun, dust and monsoon. Crack repair, weatherproof coats and an itemised quote after a site inspection.",
        intro:
          "Agra's summer heat, dust and monsoon take a toll on outer walls. We inspect the exterior, repair cracks where needed and apply weather-resistant coatings with a clear, itemised quote.",
        notes: [
          {
            title: "The best season",
            body: "In Agra the dry months, roughly October to March, are the best window for outside walls. Exterior paint is not applied in heavy rain, because moisture under the coat spoils adhesion and finish.",
          },
          {
            title: "Strong sun",
            body: "Long summer afternoons fade deep colours on sun-facing walls fastest. Stone, beige and warm white shades fade less visibly and hide dust better than bright white.",
          },
          {
            title: "Dust and rain marks",
            body: "Dust settles on parapets and ledges and runs down the walls with the first rain. Cleaning before primer, and checking drip lines, pipes and AC drains at the inspection, keeps new paint from streaking early.",
          },
        ],
        faqs: [
          {
            q: "When is the best time for exterior painting in Agra?",
            a: "Dry months, roughly October to March, are best. We avoid applying exterior paint during heavy rain because moisture affects adhesion and finish.",
          },
        ],
      },
      mathura: {
        description:
          "Exterior house painting in Mathura that stands up to summer sun, dust and monsoon rain: crack repair, weatherproof coats and an itemised quote.",
        intro:
          "Outer walls in Mathura take strong sun, dust and heavy monsoon rain. We inspect the exterior, repair cracks where needed and apply weather-resistant coatings, all set out in an itemised quotation.",
        notes: [
          {
            title: "After the rains",
            body: "In Mathura the dry months after the monsoon, roughly October to March, are the best time for outside walls. Exterior paint is not applied in heavy rain, because moisture under the coat spoils its grip.",
          },
          {
            title: "Shared walls in the old city",
            body: "Houses near Holi Gate and in the older lanes often share walls and have little room for ladders. The inspector checks access to every face of the building and lists any scaffolding in the quote.",
          },
        ],
        faqs: [
          {
            q: "When should I paint the outside of my house in Mathura?",
            a: "In the dry months, roughly October to March. Exterior coats need dry walls and dry weather to bond properly, so the monsoon is avoided.",
          },
        ],
      },
      vrindavan: {
        description:
          "Exterior painting in Vrindavan for houses and rental buildings: crack repair, weather-resistant coats and an itemised quote after a site inspection.",
        intro:
          "Vrindavan's hot summers, monsoon damp near the Yamuna and weeks of Holi colour all show on outer walls. We inspect the exterior, repair what needs it and apply weather-resistant coats, with an itemised quote.",
        notes: [
          {
            title: "After the Holi season",
            body: "Holi colour and gulal stain gates and outer walls every spring. Repainting after the Holi weeks keeps the new coat clean, and a smoother exterior finish makes the next year's colour easier to wash off.",
          },
          {
            title: "Damp near the ghats",
            body: "Walls near the Yamuna and the ghats stay damp longer after the rains. The inspector checks for seepage and algae, and the quotation lists cleaning and any repairs before the primer.",
          },
        ],
        faqs: [
          {
            q: "When is the best time for exterior painting in Vrindavan?",
            a: "The dry months, roughly October to March. If your gate and outer walls get coloured every Holi, painting just after Holi keeps the fresh coat clean for longer.",
          },
        ],
      },
    },
  },
  {
    slug: "door-window-painting",
    image: images.windowGrill,
    accent: "bg-sage-deep text-on-ink",
    name: "Doors, Windows & Small Jobs",
    shortName: "Doors & windows",
    title: "Door, Window & Small Paint Jobs",
    description:
      "Paint a single wall, a door, windows or iron grills without hiring a crew for the whole house: an on-site look, an itemised quote and a supervised finish.",
    intro:
      "Not every job is a whole house. We paint a single feature wall, a front door, wooden windows, iron grills and gates, or touch up one damaged room, with the same inspection, itemised quote and supervision as a full repaint.",
    leadService: "Doors, Windows & Small Jobs",
    includes: [
      "A single wall, one room or a ceiling",
      "Wooden doors, frames and windows",
      "Iron grills, gates and railings",
      "Rust and old flaking paint removed before painting",
      "Primer and finish coats with the paint you approve",
      "Floor, glass and fitting protection, and cleanup",
    ],
    suitableFor: ["A feature wall in one room", "A worn front door or main gate", "Rusty window grills and railings", "Touch-ups before a function or a sale"],
    process: [
      {
        step: "Tell us the job, however small",
        detail: "Book online and note what needs painting in the form: one wall, two doors, the grills on the balcony. Photos on the call help us bring the right materials.",
      },
      {
        step: "Inspection",
        detail: "The inspector checks the surface: wood for cracks, old paint and moisture; metal for rust and flaking; walls for damp and loose putty. They also bring shade cards for the colour.",
      },
      {
        step: "Itemised quotation",
        detail: "Each item is listed on its own line (the wall, each door, the grill area) with the preparation, primer and paint for it, so you can add or drop items before you approve.",
      },
      {
        step: "Preparation",
        detail: "Old loose paint is scraped and sanded, rust is wire-brushed, gaps and dents in wood are filled, and glass, hinges, handles and the floor are masked.",
      },
      {
        step: "Primer and finish coats",
        detail: "Wood and metal get the primer that suits them, then enamel or the finish on the quote. Walls get the same system as a full repaint, only smaller.",
      },
      {
        step: "Cleanup and walkthrough",
        detail: "Masking comes off, splashes are cleaned from glass and floors, and you check every item against the quotation before the job is closed.",
      },
    ],
    paintSystem: [
      {
        title: "Wooden doors and windows",
        body: "Old flaking paint is scraped and sanded, cracks and dents are filled with wood filler, and a wood primer goes on bare spots before the enamel or the finish you choose.",
      },
      {
        title: "Iron grills, gates and railings",
        body: "Rust is removed with a wire brush and sandpaper, a rust-inhibiting metal primer seals the bare metal, and enamel finish coats follow. Painting over rust without this lets it bubble through within months.",
      },
      {
        title: "A single wall",
        body: "The wall gets the same layers as a full repaint: repairs, putty where needed, primer and two finish coats, cut in cleanly at the ceiling and the corners so the edges stay sharp.",
      },
      {
        title: "Touch-ups",
        body: "Patches are matched to the existing shade from its code where you have it. An exact match on old, faded paint is not always possible, so the inspector tells you when painting the whole wall will look better.",
      },
    ],
    costFactors: [
      { title: "Number of items", body: "Each wall, door, window and grill is listed on its own line, so the quotation grows only with what you add." },
      { title: "Surface condition", body: "Heavy rust, many layers of old paint or damaged wood take more preparation than a sound surface." },
      { title: "Finish", body: "Enamel, a wood finish or a premium wall range each cost differently; the quotation names the product for each item." },
      { title: "Access", body: "Ground-floor doors are quicker than grills on upper floors, which may need ladders or scaffolding." },
    ],
    timeline: [
      "A single wall or a door is usually a short job, but each coat needs its drying time before the next, and enamel dries slower than wall paint. Your quotation states how long the work will take.",
      "Small jobs can often be fitted in alongside other bookings, so tell us when you need it done when you book.",
    ],
    aftercare: [
      "Keep freshly enamelled doors and windows slightly open and untouched while the paint dries, so they do not stick to the frame.",
      "Avoid hanging things on a freshly painted grill or gate until the enamel has hardened.",
      "Clean painted wood and metal with a soft damp cloth, not abrasive cleaners.",
      "Keep the quotation: the shade codes and products on it make a later touch-up a quick match.",
    ],
    shades: {
      intro:
        "A front door or a feature wall is where a strong colour works best: a deep blue door or one bold wall, with the rest kept calm.",
      palettes: ["blue-door-exterior", "dramatic-feature-wall"],
    },
    faqs: [
      {
        q: "Will you take a job as small as one wall or one door?",
        a: "Yes. A single wall, one door, a few windows or a grill is a job we take. It gets the same inspection, itemised quote and supervision as a full house.",
      },
      {
        q: "Can you paint rusty grills and gates?",
        a: "Yes. Rust is brushed off and the bare metal is primed with a rust-inhibiting primer before the enamel coats, so the rust does not come back through the paint quickly.",
      },
      {
        q: "Can you match my existing wall colour for a touch-up?",
        a: "If you have the shade code we use it. Old paint fades, so a patch may still show; the inspector tells you when painting the whole wall will look better.",
      },
    ],
    local: {
      agra: {
        description:
          "Doors, windows, grills or a single wall painted in Agra: no job too small. On-site inspection, an itemised quote, rust and wood prep, supervised finish.",
        intro:
          "Paint a single wall, a front door, wooden windows or iron grills and gates anywhere in Agra, without booking a crew for the whole house. The same inspection, itemised quote and supervision as a full repaint.",
        notes: [
          {
            title: "Dust and sun on doors and grills",
            body: "Agra's dust settles on wet enamel, so outdoor doors, gates and grills are painted on calm days and protected while they dry. Strong summer sun fades and chalks dark enamel on gates faster, which the inspector weighs when you choose a colour.",
          },
          {
            title: "Monsoon rust",
            body: "Damp monsoon months bring rust out on grills and railings. Painting them in the dry months, after the rust is removed and the metal is primed, gives the coats the best start.",
          },
        ],
        faqs: [
          {
            q: "Do you paint just the main gate or the balcony grills in Agra?",
            a: "Yes. Gates, grills and railings are a job on their own: rust is removed, the metal is primed, and enamel finish coats follow, in the dry months where possible.",
          },
        ],
      },
      mathura: {
        description:
          "Doors, windows, grills or a single wall painted in Mathura, with no job too small: an on-site inspection, an itemised quote and a supervised finish.",
        intro:
          "Paint a single wall, a main door, wooden windows or iron grills and gates anywhere in Mathura, without booking a crew for the whole house. You get the same inspection, itemised quote and supervision as a full repaint.",
        notes: [
          {
            title: "Gates and grills before festivals",
            body: "A freshly painted main gate is a common job before Janmashtami and Diwali. Booking early leaves the enamel time to dry and harden before visitors arrive.",
          },
          {
            title: "Rust after the monsoon",
            body: "Mathura's monsoon brings rust out on grills, railings and gates. Rust is brushed off and the metal primed before enamel, in the dry months where possible.",
          },
        ],
        faqs: [
          {
            q: "Can you paint just our main gate in Mathura before Janmashtami?",
            a: "Yes. A gate on its own is a job: the rust is removed, the metal primed and enamel coats applied. Book a few weeks ahead so it has time to dry before the festival.",
          },
        ],
      },
      vrindavan: {
        description:
          "Doors, windows and grills painted in Vrindavan, or a single wall: no job too small. Inspection, itemised quote, rust and wood preparation, supervised work.",
        intro:
          "Paint a front door, carved wooden windows, iron grills or one wall in Vrindavan without booking a crew for the whole house. Every small job gets the same inspection, itemised quote and supervision.",
        notes: [
          {
            title: "Old wooden doors",
            body: "Older Vrindavan homes often have heavy wooden doors and window frames with many old coats. Loose paint is scraped back and the wood filled and sanded, so the new enamel lies smooth.",
          },
          {
            title: "Gates after Holi",
            body: "Holi colour stains gates and grills every year. Painting them after the Holi weeks, once the rust is removed and the metal primed, keeps the finish clean for longer.",
          },
        ],
        faqs: [
          {
            q: "Do you repaint old wooden doors in Vrindavan?",
            a: "Yes. The inspector checks the wood for cracks, rot and old paint, and the quotation lists the scraping, filling and sanding before the enamel coats.",
          },
        ],
      },
    },
  },
  {
    slug: "rental-property-painting",
    image: images.rentalFlat,
    accent: "bg-golden text-ink",
    name: "Rental Property Painting",
    shortName: "Rental",
    title: "Rental Property and PG Painting",
    description:
      "Repaint rental flats, houses and PGs between tenants without visiting the site: inspection, economy or standard paint, photo updates and an itemised quote.",
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
    suitableFor: ["Landlords", "PG and hostel owners", "Property managers", "Owners living in another city"],
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
    },
    faqs: [
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
    local: {
      agra: {
        description:
          "Repaint rental flats, houses and PGs in Agra between tenants without visiting the site. Supervised painters, photo updates and one itemised quotation.",
        intro:
          "Repaint rented flats, houses and PGs in Agra between tenants without visiting the site every day. We handle inspection, painting and cleanup, and send photo updates so the property is ready to let again quickly.",
        notes: [
          {
            title: "If you live outside Agra",
            body: "Keys can be collected by arrangement. Inspection photos and the itemised quote come to you online, and progress photos follow through the job, so there is no need to travel for it.",
          },
          {
            title: "Between tenancies",
            body: "Tell us the move-out and move-in dates when you book. The quotation states the expected duration, so the job can be planned into the gap between tenants.",
          },
        ],
        faqs: [
          {
            q: "Can you paint the property if I live outside Agra?",
            a: "Yes. We can collect keys by arrangement, share inspection photos and the quotation online, and send progress photos until the job is complete.",
          },
        ],
      },
      mathura: {
        description:
          "Rental flats, houses and PGs in Mathura repainted between tenants, without you on site: supervised painters, photo updates and one itemised quote.",
        intro:
          "Repaint rented flats, houses and PGs in Mathura between tenants without visiting the site every day. We handle the inspection, painting and cleanup, and send photo updates until the property is ready to let.",
        notes: [
          {
            title: "Owners living away",
            body: "Many Mathura property owners live in Delhi, Agra or further away. Keys can be collected by arrangement, and the inspection photos, the quote and progress photos all come to you online.",
          },
          {
            title: "Student and job rentals",
            body: "Rooms let to students and staff change hands often. Tell us the move-out and move-in dates when you book; the quotation states the expected duration so the work fits the gap.",
          },
        ],
        faqs: [
          {
            q: "Can you repaint my rental in Mathura if I live in another city?",
            a: "Yes. Keys can be collected by arrangement, inspection photos and the itemised quote are shared online, and progress photos follow until the job is complete.",
          },
        ],
      },
      vrindavan: {
        description:
          "Repainting for rental homes and PG rooms in Vrindavan between tenants: an inspection, an itemised quote, supervised painters and photo updates throughout.",
        intro:
          "Vrindavan has many homes let to families and devotees who stay for months. We repaint rented flats, houses and PG rooms in Vrindavan between tenants, handle the cleanup and send photo updates, so you need not be there.",
        notes: [
          {
            title: "Lets around the festival calendar",
            body: "Demand for rooms rises around Holi, Janmashtami and Kartik. Tell us when the next tenants arrive; the quotation states how long the work takes, so it can be planned before the busy weeks.",
          },
          {
            title: "Owners who live away",
            body: "Keys can be collected by arrangement, and the inspection photos, the quote and daily progress photos come to you online, wherever you live.",
          },
        ],
        faqs: [
          {
            q: "Can you get my Vrindavan flat ready before the next tenants arrive?",
            a: "Yes, if the dates allow. Tell us the move-in date when you book; the quotation states the expected duration, and the crew is sized to finish within it.",
          },
        ],
      },
    },
  },
];

export function getService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

/** A weather note on a city page, with an optional link (to a service in that city or a tool). */
export type CityWeather = { title: string; text: string; link?: { href: string; label: string } };

/**
 * A city we paint in. Every city gets /services/house-painting/<slug> (its main page) and
 * /services/<service>/<slug> for each service with a `local` entry for it. Add a city here, plus
 * the services' `local` copy for it, and its pages, sitemap entries and menu links follow.
 */
export type City = {
  slug: string;
  name: string;
  /** The region the city is grouped under in menus ("Uttar Pradesh", "Delhi NCR", "Karnataka"). */
  region: string;
  /**
   * "live": we paint here; its pages are indexed and in the sitemap. "soon": a waitlist page only,
   * noindex and out of the sitemap, so search never sends people to a city we cannot serve yet.
   * Switch to "live" (and add the services' `local` copy and the localities) when crews start.
   */
  status: "live" | "soon";
  /** Localities we serve and supervise; each has an anchor on the city page (areaSlug). */
  areas: readonly string[];
  /** The city page: 140–155 characters. */
  description: string;
  intro: string;
  weather: CityWeather[];
};

/** Mathura localities we serve and supervise (anchors on its city page). */
const mathuraAreas = [
  "Krishna Nagar",
  "Govind Nagar",
  "Dampier Nagar",
  "Radhika Vihar",
  "Laxmi Nagar",
  "Maholi Road",
  "Masani",
  "Bhuteshwar",
  "Jaisinghpura",
  "Mahavidya Colony",
  "Deeg Gate",
  "Holi Gate",
] as const;

/** Vrindavan localities we serve and supervise (anchors on its city page). */
const vrindavanAreas = [
  "Raman Reti",
  "Chhatikara Road",
  "Parikrama Marg",
  "Gopinath Bazar",
  "Loi Bazar",
  "Atalla Chungi",
  "Gaushala Nagar",
  "Rukmini Vihar",
  "Keshi Ghat",
  "Sunrakh",
] as const;

export const cities: City[] = [
  {
    slug: "agra",
    name: site.city,
    region: site.region,
    status: "live",
    areas: site.areas,
    description: `House painting services in ${site.city}: interiors, exteriors and rental homes, with an on-site inspection, an itemised quote and a supervised crew. Book online.`,
    intro: `Interior, exterior and rental painting across ${site.areas.length} localities of ${site.city}, a list kept short so a supervisor can reach every site. Every job starts the same way: an on-site inspection and an itemised quotation, and nothing is booked until you approve it.`,
    weather: [
      {
        title: "Summer heat and dust",
        text: `Summers in ${site.city} are long, hot and dusty. Walls are cleaned before primer goes on, and a washable finish is worth it in living rooms, kitchens and kids' rooms, where dust and hand marks get wiped off often. Very dark exterior shades take in more heat and fade faster in strong sun.`,
        link: { href: "/colours", label: "Find light shades" },
      },
      {
        title: "Monsoon damp",
        text: "Paint applied over a damp wall blisters and peels. The inspector checks for seepage from the roof, bathrooms and plumbing; the cause should be fixed and the wall dried and primed before any finish coat. Repairs found at the inspection are listed separately in your quotation.",
      },
      {
        title: "Exterior walls",
        text: "Outer walls need cracks filled, an exterior primer and weather-resistant finish coats. Dry months, roughly October to March, are the best time; exterior paint is not applied in heavy rain because moisture affects adhesion and finish.",
        link: { href: "/services/exterior-painting/agra", label: `Exterior painting in ${site.city}` },
      },
    ],
  },
  {
    slug: "mathura",
    name: "Mathura",
    region: site.region,
    status: "live",
    areas: mathuraAreas,
    description: "House painting in Mathura, from Krishna Nagar to Dampier Nagar: an on-site inspection, an itemised quote and a supervised crew, with zero advance to pay.",
    intro: `Interior, exterior and rental painting across ${mathuraAreas.length} localities of Mathura, from the old city lanes near Holi Gate to the colonies off Maholi Road. Every job starts with an on-site inspection and an itemised quotation, and nothing is booked until you approve it.`,
    weather: [
      {
        title: "Summer heat and dust",
        text: "Mathura's summers are as hot and dusty as Agra's, and fine dust settles on walls and ledges. Walls are cleaned before primer goes on, and a washable finish suits living rooms and kitchens, where marks get wiped off often.",
        link: { href: "/services/interior-painting/mathura", label: "Interior painting in Mathura" },
      },
      {
        title: "Janmashtami and the monsoon",
        text: "Janmashtami falls in the monsoon, when outer walls stay damp. Rooms indoors can be painted then once the inspector has checked for seepage; outside walls are best left for the dry months after the rains.",
      },
      {
        title: "Old city lanes",
        text: "Homes in the older lanes near Holi Gate and Deeg Gate often share walls and have narrow access. The inspector notes how ladders and materials reach each wall, so the quotation covers it before work starts.",
        link: { href: "/services/exterior-painting/mathura", label: "Exterior painting in Mathura" },
      },
    ],
  },
  {
    slug: "vrindavan",
    name: "Vrindavan",
    region: site.region,
    status: "live",
    areas: vrindavanAreas,
    description: "House painting in Vrindavan for homes and rental flats, from Raman Reti to Chhatikara Road: an inspection, an itemised quote and a supervised crew.",
    intro: `Interior, exterior and rental painting across ${vrindavanAreas.length} localities of Vrindavan, from the parikrama lanes to the new colonies on Chhatikara Road. Each job starts with an on-site inspection and an itemised quotation, and nothing is booked until you approve it.`,
    weather: [
      {
        title: "Holi colours on outer walls",
        text: "Braj Holi lasts for weeks, and colour splashed on gates and outer walls can stain fresh paint. Many owners repaint the outside after the Holi season, and the inspector can suggest finishes that wash clean more easily.",
        link: { href: "/services/exterior-painting/vrindavan", label: "Exterior painting in Vrindavan" },
      },
      {
        title: "Monsoon damp near the Yamuna",
        text: "Homes close to the Yamuna and the ghats see more damp in the monsoon. The inspector checks walls for seepage before quoting, because paint over a damp wall peels; the cause is noted so it can be fixed first.",
      },
      {
        title: "Older plaster",
        text: "Older buildings in the parikrama lanes often have soft or powdery plaster. It is scraped back and sealed with a primer before any finish coat, and the quotation lists that preparation as its own line.",
        link: { href: "/services/interior-painting/vrindavan", label: "Interior painting in Vrindavan" },
      },
    ],
  },
  {
    slug: "delhi-ncr",
    name: "Delhi NCR",
    region: "Delhi NCR",
    status: "soon",
    areas: [],
    description: "Paint Saathi is coming to Delhi NCR: managed house painting with an on-site inspection, an itemised quote and a supervised crew. Join the waitlist.",
    intro: "We are getting ready to paint homes in Delhi, Noida, Gurugram, Ghaziabad and Faridabad, with the same inspection, itemised quotation and supervised crews as in Agra. Leave your number and we will call you when bookings open in your area.",
    weather: [],
  },
  {
    slug: "bangalore",
    name: "Bangalore",
    region: "Karnataka",
    status: "soon",
    areas: [],
    description: "Paint Saathi is coming to Bangalore: managed house painting with an on-site inspection, an itemised quote and a supervised crew. Join the waitlist.",
    intro: "We are getting ready to paint homes in Bangalore, with the same inspection, itemised quotation and supervised crews as in Agra. Leave your number and we will call you when bookings open in your area.",
    weather: [],
  },
];

/** Cities where we paint now. */
export const liveCities = () => cities.filter((c) => c.status === "live");

/** "Agra, Mathura and Vrindavan" (or "or"): the live cities as a phrase for copy. */
export function liveCityNames(conjunction: "and" | "or" = "and"): string {
  const names = liveCities().map((c) => c.name);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} ${conjunction} ${names.at(-1)}` : names.join("");
}

/** The city the business started in: the home page, the booking form and the schema address. */
export const homeCity = cities[0];

export function getCity(slug: string): City | undefined {
  return cities.find((c) => c.slug === slug);
}

/** The services offered in a city: those with copy written for it, and only in a live city. */
export function servicesIn(city: City): Service[] {
  return city.status === "live" ? services.filter((s) => city.slug in s.local) : [];
}

/** "/services/house-painting/agra": a city's main painting page. */
export const cityPath = (city: City) => `/services/house-painting/${city.slug}`;
/** "/services/interior-painting" (the hub) or "/services/interior-painting/agra" (in a city). */
export const servicePath = (service: Service, city?: City) => (city ? `/services/${service.slug}/${city.slug}` : `/services/${service.slug}`);
/** "Interior Wall Painting Services in Agra". */
export const serviceCityTitle = (service: Service, city: City) => `${service.title} in ${city.name}`;

/**
 * The service promises (owner-stated policy), shown on the home page, the booking page, city pages
 * and beside the booking form. Each one matches what the rest of the copy commits to.
 */
export const promises: { title: string; text: string }[] = [
  { title: "Zero advance payment", text: "You pay nothing up front. No payment is due before the work starts." },
  { title: "Full estimate before work starts", text: "An itemised quote after the site visit: area, preparation, paint, coats and timeline. Nothing starts until you approve it." },
  { title: "Timed work", text: "The quotation states how long the job takes, and the crew is sized to finish within it." },
  { title: "Fully documented", text: "A written quotation, daily photo updates, written approval for any change and an invoice at the end." },
  { title: "Zero compromise on quality", text: "Genuine branded paint, every preparation step the quote lists, and a supervisor checking each stage before handover." },
  { title: "What's best for you, not for us", text: "We recommend the paint, finish and repairs that suit your walls and budget, never the option that simply pays us more." },
];

/**
 * How the work is done, from booking to handover: the flow on the home page and the house-painting
 * hub. Each step can take an illustration (`image`, a PNG of people painting) when the owner sends one.
 */
export const workFlow: { title: string; text: string; image?: { src: string; alt: string } }[] = [
  { title: "Book online", text: "Name, mobile number and address. Add what needs painting if you like: one wall, a door, the window grills or the whole house." },
  { title: "We call you back", text: `During working hours (${site.hoursDisplay}) to understand the job and fix a time for the site visit.` },
  { title: "Site inspection", text: "The inspector measures, checks walls for damp and cracks, wood for rot and metal for rust, and brings shade cards so you choose colours in your own light." },
  { title: "Full estimate, in writing", text: "An itemised quote: each wall, door or grill, the preparation, the paint and its coats, and how long it takes. Nothing starts until you approve it, and there is no advance payment." },
  { title: "Preparation", text: "Floors, furniture and fittings are covered. Cracks are filled, old loose paint scraped, rust brushed off, then putty and primer as the quote lists." },
  { title: "Painting, supervised", text: "The crew applies the coats on the quote to the stated timeline, a supervisor checks each stage, and you get photo updates every day." },
  { title: "Walkthrough and handover", text: "You check every item against the quotation, touch-ups are done, the site is cleaned, and you get the invoice." },
];

/**
 * How booking painters online works, shown (and marked up as FAQPage) on /book only. Facts only:
 * the form's fields, the call-back hours, the free estimate and approval before any work.
 */
export const bookingSteps: { title: string; text: string }[] = [
  { title: "Fill in the form", text: "Your name, mobile number and address. Add what needs painting if you like, from one wall or a door to the whole house. It takes about a minute." },
  { title: "We call you back", text: `During working hours (${site.hoursDisplay}) to understand the job and fix a time for the site visit.` },
  { title: "Inspection and itemised quote", text: "Our inspector measures the walls, checks for damp and cracks, and you get a line-by-line quotation." },
  { title: "Approve, then we paint", text: "Nothing is scheduled until you approve the quote, and there is no advance payment. A supervised crew then paints to the stated timeline." },
];

export const bookingFaqs: FaqItem[] = [
  {
    q: `Can I book painters online in ${site.city}?`,
    a: `Yes. Fill in the booking form on this page with your name, mobile number and address, and add what needs painting if you like. It takes about a minute, and we call you back during working hours (${site.hoursDisplay}) to fix a time for the site inspection.`,
  },
  {
    q: "Is the estimate free?",
    a: "Yes. The inspector measures your walls and checks their condition, and you get an itemised quotation at no charge. Nothing is booked until you approve the quote.",
  },
  {
    q: "Do I have to pay anything in advance?",
    a: "No. We work with zero advance payment: you pay nothing before the work starts. The quotation you approve sets out the payment schedule, and every change is approved in writing first.",
  },
  {
    q: "What details do I need to book painters online?",
    a: "Your name, a 10-digit mobile number and your address: house or flat number and street, locality and PIN code. Everything else is optional, under Add more details: what needs painting, the property type, floors, home size, carpet area, a preferred date and a note.",
  },
  {
    q: "Can I choose the inspection date?",
    a: "Yes. Open Add more details in the form and pick a preferred date, any day from today up to a year ahead, and we confirm the exact time when we call.",
  },
];

export const generalFaqs: FaqItem[] = [
  {
    q: "How does booking work?",
    a: "Book painters online with the booking form, or by phone. We visit your property, measure the walls and note their condition, then send an itemised quotation. Work is scheduled only after you approve the quote.",
    link: { href: "/book", label: "Book an inspection" },
  },
  {
    q: `Do you have painters near me in ${site.city}?`,
    a: `We currently serve ${site.areas.join(", ")}. If your area is not listed, book anyway and we will confirm whether we can serve you.`,
    link: { href: "/services/house-painting/agra#localities", label: `See the areas we serve in ${site.city}` },
  },
  {
    q: "Which cities do you paint in?",
    a: `We paint homes in ${liveCityNames()}, each with its own localities and supervisors; ${cities.filter((c) => c.status === "soon").map((c) => c.name).join(" and ")} are coming next. Book in any of them and we call you back to fix the site visit.`,
    link: { href: "/services/house-painting", label: "See every city we paint in" },
  },
  {
    q: "How is the price calculated?",
    a: `Price depends on the measured wall area, surface condition, preparation needed, paint brand and range, and the number of coats. As a rule of thumb, the walls and ceilings inside a home add up to about 3 to 3.5 times its carpet area, so a 2 BHK with ${sqft(twoBhk.carpetArea)} of carpet area has roughly ${sqft(twoBhk.paintArea)} to paint. ${rule[0].toUpperCase()}${rule.slice(1)}, so that home is about ${twoBhk.painterDays} painter-days of work: usually a crew of ${twoBhk.painters} for ${twoBhk.duration}. The inspector measures exactly on site, and the quotation lists each item, what is included and excluded, and the payment schedule.`,
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
