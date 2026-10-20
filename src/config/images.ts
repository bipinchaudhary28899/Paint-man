// Placeholder stock photos from Pexels (https://www.pexels.com/license/, free to use).
// Swap these for real photos of your own jobs as soon as you have them: genuine
// before/after shots build more trust and help local SEO.
// Each alt describes only what the photo shows. These are not our jobs, so no stock alt
// names Agra, a locality or a finished job. Real, consented job photos (not on images.pexels.com)
// should get a local alt ("Freshly painted teal living room in Dayalbagh, Agra"), as AGENTS.md asks.

const pexels = (id: string) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg`;

export const images = {
  heroPainter: { src: pexels("7218579"), alt: "Painter rolling white paint onto an interior wall edged with blue masking tape" },
  rollerCloseup: { src: pexels("5583126"), alt: "Close-up of a paint roller applying a smooth beige coat on a wall" },
  swatchFan: { src: pexels("6474454"), alt: "Hands holding a fan of paint colour swatches against a wall" },
  swatchSheet: { src: pexels("6583367"), alt: "Hand leafing through a fan deck of neutral paint shade cards" },
  rainbow: { src: pexels("8559022"), alt: "Fan of vividly coloured paper sheets in rainbow order" },
  trays: { src: pexels("26736629"), alt: "Paint trays and a brush pot on floor paper in front of a wall painted pale blue and sage green" },
  muralBuckets: { src: pexels("26632166"), alt: "Paint buckets on floor paper beside a large, colourful painted mural wall" },
  painterWindow: { src: pexels("5768187"), alt: "Painter preparing a window sill for painting in a room with pale grey walls" },
  livingTeal: { src: pexels("7587828"), alt: "Open-plan living room with teal sofas, white walls and exposed brick" },
  livingMoody: { src: pexels("30386991"), alt: "Living room with warm white walls, a navy sofa and open shelving" },
  livingWhite: { src: pexels("29012619"), alt: "Airy white living room with floor-to-ceiling sheer curtains and white sofas" },
  apartment: { src: pexels("6588580"), alt: "Modern hallway with pale grey walls, flush doors and a wooden slat partition" },
  exteriorBlue: { src: pexels("20296321"), alt: "Two-storey house with a pale blue-grey exterior behind a trimmed hedge" },
  exteriorTerracotta: { src: pexels("8336130"), alt: "Large house with a warm terracotta-coloured exterior and a round corner turret" },
} as const;

export type SiteImage = (typeof images)[keyof typeof images];

/**
 * The owner's Paint Saathi illustrations: transparent WebP cut-outs in public/brand/illustrations
 * (the painter and the paint can came with a checkerboard drawn into the picture, which was removed;
 * the toolbox was already transparent). Our own brand art, so the alt names the brand.
 */
export const illustrations = {
  paintBrands: {
    src: "/brand/illustrations/paint-brands.webp",
    width: 1790,
    height: 968,
    alt: "Paint tins from brands sold in India on display stands: Jotun, Berger, Indigo, Kansai Nerolac, Asian Paints, Dulux, Shalimar, British Paints and Snowcem",
  },
  painter: {
    src: "/brand/illustrations/painter-roller.webp",
    width: 1160,
    height: 1024,
    alt: "Paint Saathi painter in a white branded uniform and cap rolling yellow paint onto a wall",
  },
  paintCan: {
    src: "/brand/illustrations/paint-can.webp",
    width: 1345,
    height: 909,
    alt: "Open Paint Saathi paint can with yellow paint dripping down its side and its lid beside it",
  },
  toolbox: {
    src: "/brand/illustrations/toolbox.webp",
    width: 1259,
    height: 974,
    alt: "Yellow Paint Saathi toolbox holding tins of paint, with brushes and rollers beside it",
  },
} as const;

export type Illustration = (typeof illustrations)[keyof typeof illustrations];
