import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { Linking, Text } from "react-native";

import { Blob, OutlineHeading, ShapedPhoto } from "~/components/content/Decor";
import { boldInk, ButtonRow, CityLinks, GradientText, gradientAt, InlineLink, TapLink } from "~/components/content/Inline";
import { H } from "~/components/ui/Text";
import { contrast, goldenText, mix } from "~/lib/contrast";
import { cityPath, images, liveCities } from "~/shared";
import { colors } from "~/theme";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  usePathname: jest.fn(() => "/"),
  useLocalSearchParams: jest.fn(() => ({})),
}));

beforeEach(() => jest.clearAllMocks());

describe("GradientText", () => {
  it("runs from terracotta-light through the text golden to sage", () => {
    expect(gradientAt(0)).toBe(colors.terracottaLight);
    expect(gradientAt(0.5)).toBe(goldenText);
    expect(gradientAt(1)).toBe(colors.sage);
    expect(gradientAt(-1)).toBe(colors.terracottaLight);
    expect(gradientAt(2)).toBe(colors.sage);
    expect(gradientAt(0.25)).toBe(mix(colors.terracottaLight, goldenText, 0.5));
  });

  it("reads at 3:1 or more (large text) on canvas, cream and white at every letter", () => {
    for (let t = 0; t <= 1; t += 0.02) for (const bg of [colors.canvas, colors.creamWash, colors.paper]) expect(contrast(gradientAt(t), bg)).toBeGreaterThanOrEqual(3);
  });

  it("colours each letter and keeps the word whole inside its heading", async () => {
    await render(
      <H>
        made <GradientText>stress-free</GradientText>
      </H>,
    );
    expect(screen.getByRole("header", { name: "made stress-free" })).toBeOnTheScreen();
    const letters = screen.getAllByText("s", { exact: true });
    expect(letters).toHaveLength(3);
    expect(letters[0]).toHaveStyle({ color: gradientAt(0.5 / 11) });
  });
});

describe("links", () => {
  it("open their website href, in the linkClass or a plain underline", async () => {
    await render(
      <Text>
        <InlineLink href="/book">Book an inspection</InlineLink> <InlineLink href="/contact" plain>
          contact page
        </InlineLink>
      </Text>,
    );
    expect(screen.getByRole("link", { name: "Book an inspection" })).toHaveStyle({ textDecorationColor: colors.terracotta });
    expect(screen.getByRole("link", { name: "contact page" })).not.toHaveStyle({ textDecorationColor: colors.terracotta });
    await fireEvent.press(screen.getByRole("link", { name: "Book an inspection" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/book", params: {} });
  });

  it("take their own action and style", async () => {
    const onPress = jest.fn();
    await render(
      <InlineLink href="/x" onPress={onPress} style={boldInk}>
        x
      </InlineLink>,
    );
    await fireEvent.press(screen.getByRole("link", { name: "x" }));
    expect(onPress).toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("name each live city with its page, joined as a sentence", async () => {
    const live = liveCities();
    await render(
      <Text testID="line">
        in <CityLinks conjunction="or" />
      </Text>,
    );
    const names = live.map((c) => c.name);
    expect(screen.getByTestId("line")).toHaveTextContent(`in ${names.slice(0, -1).join(", ")} or ${names.at(-1)}`);
    await fireEvent.press(screen.getByRole("link", { name: live[0].name }));
    expect(router.push).toHaveBeenCalledWith({ pathname: cityPath(live[0]), params: {} });
  });

  it("joins two cities with 'and' and one stands alone", async () => {
    const [a, b] = liveCities();
    await render(
      <Text testID="two">
        <CityLinks live={[a, b]} />
      </Text>,
    );
    expect(screen.getByTestId("two")).toHaveTextContent(`${a.name} and ${b.name}`);
  });

  it("gives a link on its own line a 44pt target, and rows of buttons wrap", async () => {
    const onPress = jest.fn();
    await render(
      <ButtonRow center>
        <TapLink label="How it works →" onPress={onPress} />
      </ButtonRow>,
    );
    await fireEvent.press(screen.getByRole("link", { name: "How it works →" }));
    expect(onPress).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "How it works →" })).toHaveStyle({ minHeight: 44 });
  });
});

describe("OutlineHeading", () => {
  it("reads as one heading and outlines its word", async () => {
    await render(<OutlineHeading parts={["A managed service, ", { outline: "not" }, " a directory"]} size={36} leading={40 / 36} />);
    expect(screen.getByRole("header", { name: "A managed service, not a directory" })).toBeOnTheScreen();
    const word = screen.getByTestId("outlined-word");
    // 16 ink copies around it, then the canvas fill on top
    expect(word.children).toHaveLength(17);
    expect(screen.getAllByText("not").at(-1)).toHaveStyle({ color: colors.canvas });
    expect(screen.getAllByText("not")[0]).toHaveStyle({ color: colors.ink, position: "absolute" });
  });
});

describe("ShapedPhoto and Blob", () => {
  it("names its photo and draws the shape once laid out", async () => {
    await render(<ShapedPhoto image={images.workersTeam} shape="blob2" backdrop="#ffd84d" aspectRatio={4 / 3} />);
    const photo = screen.getByLabelText(images.workersTeam.alt);
    expect(photo).toHaveStyle({ aspectRatio: 4 / 3 });
    expect(screen.toJSON()).not.toHaveProperty("children.0");
    await fireEvent(photo, "layout", { nativeEvent: { layout: { width: 353, height: 265, x: 0, y: 0 } } });
    // react-native-svg hands colours to the native side as ARGB integers
    expect(JSON.stringify(screen.toJSON())).toContain(String(0xffffd84d));
    expect(JSON.stringify(screen.toJSON())).toContain("pexels-photo-9491942");
  });

  it("can go without a backdrop, and waits for a real size", async () => {
    await render(<ShapedPhoto image={images.workersTeam} shape="blob2" aspectRatio={1} />);
    const photo = screen.getByLabelText(images.workersTeam.alt);
    await fireEvent(photo, "layout", { nativeEvent: { layout: { width: 0, height: 0, x: 0, y: 0 } } });
    expect(JSON.stringify(screen.toJSON())).not.toContain("clipPath");
    await fireEvent(photo, "layout", { nativeEvent: { layout: { width: 200, height: 200, x: 0, y: 0 } } });
    expect(JSON.stringify(screen.toJSON())).toContain("clipPath");
    expect(JSON.stringify(screen.toJSON())).not.toContain(String(0xffffd84d));
  });

  it("keeps the blob out of the accessibility tree", async () => {
    await render(<Blob color={colors.sand} size={448} />);
    expect(screen.getByTestId("blob", { includeHiddenElements: true })).toHaveProp("accessibilityElementsHidden", true);
  });
});

it("never opens the website for in-app links", async () => {
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  await render(<InlineLink href="/faq">FAQ</InlineLink>);
  await fireEvent.press(screen.getByRole("link", { name: "FAQ" }));
  expect(open).not.toHaveBeenCalled();
});
