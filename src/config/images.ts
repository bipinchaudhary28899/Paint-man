// Placeholder stock photos from Pexels (https://www.pexels.com/license/, free to use).
// Swap these for real photos of your own jobs as soon as you have them: genuine
// before/after shots build more trust and help local SEO.

const pexels = (id: string) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg`;

export const images = {
  heroPainter: { src: pexels("7218579"), alt: "Painter applying fresh paint to an interior wall with a roller" },
  rollerCloseup: { src: pexels("5583126"), alt: "Close-up of a paint roller applying a smooth beige coat on a wall" },
  swatchFan: { src: pexels("6474454"), alt: "Hands holding a fan of paint colour swatches against a wall" },
  swatchSheet: { src: pexels("6583367"), alt: "Paint colour swatch sheet used for choosing wall shades" },
  rainbow: { src: pexels("8559022"), alt: "Rainbow of vivid paint colours" },
  trays: { src: pexels("26736629"), alt: "Paint trays, rollers and tools in front of a freshly painted wall" },
  muralBuckets: { src: pexels("26632166"), alt: "Paint buckets beside a freshly painted colourful wall" },
  painterWindow: { src: pexels("5768187"), alt: "Professional painter preparing a window frame for painting" },
  livingTeal: { src: pexels("7587828"), alt: "Bright living room with teal sofa and freshly painted walls" },
  livingMoody: { src: pexels("30386991"), alt: "Cosy living room with a deep blue painted feature wall" },
  livingWhite: { src: pexels("29012619"), alt: "Airy living room with clean white painted walls" },
  apartment: { src: pexels("6588580"), alt: "Freshly painted rental apartment hallway" },
  exteriorBlue: { src: pexels("20296321"), alt: "House exterior freshly painted in calm blue-grey" },
  exteriorTerracotta: { src: pexels("8336130"), alt: "House with a warm terracotta exterior paint finish" },
} as const;

export type SiteImage = (typeof images)[keyof typeof images];
