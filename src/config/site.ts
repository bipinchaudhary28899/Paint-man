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

export type Service = {
  slug: string;
  image: SiteImage;
  accent: string;
  name: string;
  shortName: string;
  title: string;
  description: string;
  intro: string;
  includes: string[];
  suitableFor: string[];
  faqs: { q: string; a: string }[];
};

export const services: Service[] = [
  {
    slug: "interior-painting",
    image: images.livingTeal,
    accent: "bg-terracotta text-on-ink",
    name: "Interior Painting",
    shortName: "Interior",
    title: "Interior Wall Painting Services in Agra",
    description:
      "Interior house painting in Agra with on-site inspection, itemised quotation, genuine branded paint and supervised painters. Book an inspection today.",
    intro:
      "Repaint bedrooms, living rooms, kitchens and ceilings without managing painters yourself. We inspect your walls, give you an itemised quote and supervise the job until the final walkthrough.",
    includes: [
      "On-site inspection and wall measurement",
      "Surface preparation: crack filling, putty and sanding as quoted",
      "Primer and finish coats with the paint brand and range you approve",
      "Furniture, floor and fitting protection",
      "Daily site supervision and photo updates",
      "Cleanup and final walkthrough with you",
    ],
    suitableFor: ["Flats and apartments", "Independent houses", "Single rooms or full homes", "Pre-festival repainting"],
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
      "Exterior house painting in Agra with weather-resistant paints, crack repair and supervised work. Itemised quotation after a site inspection.",
    intro:
      "Agra's summer heat, dust and monsoon take a toll on outer walls. We inspect the exterior, repair cracks where needed and apply weather-resistant coatings with a clear, itemised quote.",
    includes: [
      "Inspection of walls, cracks, dampness and existing paint",
      "Cleaning, scraping and crack repair as quoted",
      "Exterior primer and weather-resistant finish coats",
      "Safe access arrangements for upper floors",
      "Site supervision and progress updates",
      "Debris removal and final inspection",
    ],
    suitableFor: ["Independent houses and kothis", "Boundary walls and gates", "Small commercial buildings", "Rental properties"],
    faqs: [
      {
        q: "When is the best time for exterior painting in Agra?",
        a: "Dry months, roughly October to March, are best. We avoid applying exterior paint during heavy rain because moisture affects adhesion and finish.",
      },
      {
        q: "Do you fix cracks before painting?",
        a: "Yes. Crack filling and surface repairs found during the inspection are listed separately in your quotation so you can see what each costs.",
      },
    ],
  },
  {
    slug: "rental-property-painting",
    image: images.livingWhite,
    accent: "bg-golden text-ink",
    name: "Rental Property Painting",
    shortName: "Rental",
    title: "Rental Flat and PG Painting in Agra for Landlords",
    description:
      "Quick repainting of rental flats, houses and PGs in Agra between tenants. One quotation, supervised painters and fast turnaround for landlords.",
    intro:
      "Repaint between tenants without visiting the site every day. We handle inspection, painting and cleanup, and send you photo updates so the property is ready to let again quickly.",
    includes: [
      "Inspection, including when you are not present",
      "Economy and standard paint options",
      "Fast scheduling between tenancies",
      "Photo updates through the job",
      "Invoice with GST details where applicable",
    ],
    suitableFor: ["Landlords", "PG and hostel owners", "Property managers", "Owners living outside Agra"],
    faqs: [
      {
        q: "Can you paint the property if I live outside Agra?",
        a: "Yes. We can collect keys by arrangement, share inspection photos and the quotation online, and send progress photos until the job is complete.",
      },
    ],
  },
];

export const generalFaqs: { q: string; a: string }[] = [
  {
    q: "How does booking work?",
    a: "Book an inspection online or by phone. We visit your property, measure the walls and note their condition, then send an itemised quotation. Work is scheduled only after you approve the quote.",
  },
  {
    q: "Which areas of Agra do you serve?",
    a: `We currently serve ${site.areas.join(", ")}. If your area is not listed, book anyway and we will confirm whether we can serve you.`,
  },
  {
    q: "How is the price calculated?",
    a: "Price depends on the measured wall area, surface condition, preparation needed, paint brand and range, and the number of coats. The quotation lists each item, what is included and excluded, and the payment schedule.",
  },
  {
    q: "Are you painters or a platform?",
    a: "We are a managed painting service. We assign and supervise vetted painting teams and stay responsible for the job from inspection to the final walkthrough, so you have one point of contact.",
  },
  {
    q: "What happens if I want extra work during the job?",
    a: "Any change, such as an extra room or a different paint, is priced and approved by you in writing before that work starts.",
  },
];
