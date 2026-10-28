// Placeholder stock photos from Pexels (https://www.pexels.com/license/, free to use).
// Swap these for real photos of your own jobs as soon as you have them: genuine
// before/after shots build more trust and help local SEO.
// Each alt describes only what the photo shows. These are not our jobs, so no stock alt
// names Agra, a locality or a finished job. Real, consented job photos (not on images.pexels.com)
// should get a local alt ("Freshly painted teal living room in Dayalbagh, Agra"), as AGENTS.md asks.

const pexels = (id: string) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg`;

export const images = {
  weatheredWall: { src: pexels("37124570"), alt: "Weathered yellow wall with flaking plaster and exposed brick around an iron window grill" },
  windowGrill: { src: pexels("37192157"), alt: "Ornate black iron window grill set in a textured sky-blue wall" },
  homeEntrance: { src: pexels("9209430"), alt: "Green double doors with carved screen panels opening onto a mint-green modern kitchen" },
  livingRoom: { src: pexels("33452539"), alt: "Living room with warm grey walls, a wooden slat panel, a wall clock and a beige sofa" },
  livingMoody: { src: pexels("30386991"), alt: "Living room with warm white walls, a navy sofa and open shelving" },
  bedroom: { src: pexels("31925629"), alt: "Bedroom with warm ochre walls, brown bedding and a window with a coloured glass border" },
  rentalFlat: { src: pexels("36195703"), alt: "Bright bedroom with plain walls, a wooden wardrobe and a large window" },
  coupleHome: { src: pexels("4307699"), alt: "Smiling couple relaxing together in a bedroom with deep green walls" },
  houseFront: { src: pexels("15574469"), alt: "House entrance with a yellow and orange front, marigold beds and a paved path" },
  workersTeam: { src: pexels("9491942"), alt: "Two smiling workers, one in a yellow hard hat, beside a brick wall on a building site" },
  houseExterior: { src: pexels("14354538"), alt: "White house with a red tiled roof, blue trim and a round window above the door" },
  // Pexels photos (free licence, edits allowed) with the Paint Saathi uniform print added to the
  // back of painters whose faces never show: they illustrate the uniform, not a named person, so no
  // identifiable person is shown endorsing the brand. They are not our crew or our jobs: the alts name
  // the uniform but never a place or a finished job (tests/backend/images.test.ts checks this).
  uniformSkimming: { src: "/photos/painter-uniform-skimming.jpg", alt: "Painter in a white Paint Saathi uniform, seen from behind, smoothing a wall with a long trowel" },
  uniformCeiling: { src: "/photos/painter-uniform-ceiling.jpg", alt: "Painter in a white Paint Saathi uniform rolling paint along a ceiling edge beside a taped window" },
  uniformSpraying: { src: "/photos/painter-uniform-spraying.jpg", alt: "Painter in a white Paint Saathi uniform spraying primer onto a bare wall in an unfinished room" },
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
