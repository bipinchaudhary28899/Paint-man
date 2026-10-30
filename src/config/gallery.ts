// The /gallery page: painting ideas from Indian homes and buildings, grouped by room or kind of
// wall. These are Pexels photos (free licence) of other people's homes, shown for ideas, NOT our
// jobs: as in images.ts, no alt or caption names Agra, a locality or a finished job, and the page
// says so. Photos of our own jobs (real, consented, in public/) go in their own group when they come.
// width/height are the photo's proportions, so each frame reserves its space before it loads.

const pexels = (id: string) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg`;

export type GalleryPhoto = { src: string; alt: string; width: number; height: number; caption: string };
export type GalleryGroup = { id: string; title: string; photos: GalleryPhoto[] };

export const galleryGroups: GalleryGroup[] = [
  {
    id: "living-rooms",
    title: "Living rooms",
    photos: [
      { src: pexels("7148779"), width: 800, height: 533, caption: "Cool greys, warm yellow accents", alt: "Bright living room with a coffered ceiling, grey sofas, yellow cushions and colourful wall art" },
      { src: pexels("34946066"), width: 800, height: 1200, caption: "Brick-red accent wall", alt: "Living room with an orange brick accent wall, wooden sofas and warm ceiling lights" },
      { src: pexels("7148849"), width: 800, height: 533, caption: "Wood, carving and a mural wall", alt: "Living room with a carved wooden screen, a mural wall, tan leather sofas and a wooden coffee table" },
      { src: pexels("33688058"), width: 800, height: 533, caption: "White with a geometric feature wall", alt: "Open living room with white walls, a geometric pattern on the TV wall and beige sofas" },
    ],
  },
  {
    id: "bedrooms",
    title: "Bedrooms",
    photos: [
      { src: pexels("7148847"), width: 800, height: 533, caption: "Bold red feature wall", alt: "Bedroom with a red tiled feature wall, a large flower mural, pink chairs and a wooden bed" },
      { src: pexels("31925619"), width: 800, height: 1218, caption: "Warm ochre walls", alt: "Bedroom with warm ochre walls, rust-brown bedding and a window framed in coloured glass" },
      { src: pexels("33688072"), width: 800, height: 533, caption: "Teal and grey, calm and cool", alt: "Bedroom with grey and teal accents, a world map on the headboard wall and sheer curtains" },
      { src: pexels("31944373"), width: 800, height: 542, caption: "Fresh lime green", alt: "Bedroom with lime-green walls, a bay window and a striped bedspread on an iron bed" },
    ],
  },
  {
    id: "kitchens",
    title: "Kitchens",
    photos: [
      { src: pexels("31944364"), width: 800, height: 1199, caption: "Red cabinets, white walls", alt: "Kitchen with red cabinets, a black counter, white tiles and a window above the stove" },
      { src: pexels("36881138"), width: 800, height: 1200, caption: "Sage green with floral tiles", alt: "Kitchen with sage-green cabinets, a floral tiled wall and warm hanging lights" },
    ],
  },
  {
    id: "doors-and-windows",
    title: "Entrances, doors and windows",
    photos: [
      { src: pexels("36110436"), width: 800, height: 1067, caption: "Blue walls, green doors", alt: "Blue house front with green wooden doors and a green window grill" },
      { src: pexels("35544013"), width: 800, height: 1000, caption: "Heritage wood and stone", alt: "Old house entrance with carved wooden doors, stone pillars and a chequered tiled floor" },
      { src: pexels("6473811"), width: 800, height: 1000, caption: "Blue with turquoise windows", alt: "Bright blue wall with two small windows painted turquoise" },
    ],
  },
  {
    id: "house-fronts",
    title: "House fronts",
    photos: [
      { src: pexels("39555167"), width: 800, height: 533, caption: "Ochre walls, green gate", alt: "Ochre house with a tiled roof, potted palms and a green gate along a quiet street" },
      { src: pexels("32031452"), width: 800, height: 1422, caption: "White and wood", alt: "Two-storey modern house with white walls, wood-look panels and a carved screen on the balcony" },
      { src: pexels("39596144"), width: 800, height: 532, caption: "Pale blue with deep blue trim", alt: "Village house with pale blue walls and dark blue doors and window frames" },
      { src: pexels("3359439"), width: 800, height: 620, caption: "Every shutter a colour", alt: "Building front with rows of red, blue, green and yellow window shutters" },
    ],
  },
  {
    id: "buildings",
    title: "Apartments and streets",
    photos: [
      { src: pexels("39700581"), width: 800, height: 1067, caption: "Sunny yellow blocks", alt: "Yellow apartment blocks with green staircases and balconies under a clear sky" },
      { src: pexels("7672060"), width: 800, height: 533, caption: "Clean white and grey", alt: "White apartment building with grey bands and balconies" },
      { src: pexels("40186666"), width: 800, height: 556, caption: "A street of colours", alt: "Old city buildings painted orange, yellow, blue and white, packed side by side" },
    ],
  },
];
