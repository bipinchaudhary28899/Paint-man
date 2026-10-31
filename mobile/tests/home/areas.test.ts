import { firstSentence } from "~/components/home/AreasSection";

describe("firstSentence", () => {
  it("takes a city intro's first sentence, or all of it when there is one", () => {
    expect(firstSentence("Painting across 10 localities. Every job starts the same way.")).toBe("Painting across 10 localities.");
    expect(firstSentence("No full stop here")).toBe("No full stop here");
    expect(firstSentence("Ends here!")).toBe("Ends here!");
  });
});
