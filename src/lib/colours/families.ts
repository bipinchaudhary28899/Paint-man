// The colour families of the named-colour catalogue (color.pizza, see web.ts): the server sorts
// each colour into one by hue and lightness, and the visualizer shows them as filter chips. Kept
// apart from web.ts, which is server-only, so the chips can use the same list in the browser.

export const colourFamilies = ["Whites", "Greys", "Beiges", "Yellows", "Oranges", "Reds", "Pinks", "Purples", "Blues", "Teals", "Greens", "Olives", "Browns"] as const;
export type ColourFamily = (typeof colourFamilies)[number];

export const isColourFamily = (s: unknown): s is ColourFamily => typeof s === "string" && (colourFamilies as readonly string[]).includes(s);
