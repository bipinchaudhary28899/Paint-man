import { render, screen } from "@testing-library/react-native";
import { Image, Pressable, Text, View } from "react-native";
import type { TestInstance } from "test-renderer";

import { BottomNav } from "~/components/site/BottomNav";
import { NavStateProvider } from "~/components/site/nav-state";
import { Pill, Sticker } from "~/components/ui/Bits";
import { Button } from "~/components/ui/Button";
import { H, MAX_SCALE, P } from "~/components/ui/Text";
import { colors } from "~/theme";
import { backgroundOf, contrastFindings, controlAndImageFindings, headerFindings, reachable, scalingFindings, tapSize, targetFindings } from "./audit";

// The audit the screen test runs, on small pieces built to fail it (so a clean screen means something),
// and the text-size caps of the fixed pieces.

jest.mock("expo-router", () => ({ router: { navigate: jest.fn() }, usePathname: jest.fn(() => "/") }));

const nodes = () => reachable(screen.container as TestInstance);

describe("the audit", () => {
  it("flags controls without a role or a name, controls a screen reader cannot reach, and unlabelled pictures", async () => {
    await render(
      <View>
        <Pressable onPress={() => undefined}>
          <Text>No role</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => undefined} />
        <Pressable accessibilityRole="button" accessibilityLabel="Card" onPress={() => undefined}>
          <Pressable accessibilityRole="link" accessibilityLabel="Inside" onPress={() => undefined} />
          <Image source={{ uri: "x.png" }} />
        </Pressable>
        <Image source={{ uri: "y.png" }} />
        <Image source={{ uri: "z.png" }} accessibilityLabel="A labelled picture" />
        <Image source={{ uri: "w.png" }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
        <Text>
          Read the <Text onPress={() => undefined}>terms</Text>.
        </Text>
      </View>,
    );
    expect(controlAndImageFindings(nodes())).toEqual([
      'control without a role: "No role"',
      "control without a name (role button)",
      'control "Inside" sits inside "Card", so a screen reader cannot reach it',
      "picture without a label and not hidden (Image)",
    ]);
  });

  it("wants the page's h1 first and once, and no empty header", async () => {
    await render(
      <View>
        <H>Section first</H>
        <H>The page</H>
        <H>The page</H>
        <Text accessibilityRole="header"> </Text>
      </View>,
    );
    expect(headerFindings(nodes(), /^The page$/)).toEqual([
      'first header is "Section first", not the page\'s h1 /^The page$/',
      "the h1 /^The page$/ is not exactly one header",
      "a header without words",
    ]);
    await render(<View />);
    expect(headerFindings(nodes(), /x/)).toEqual(["no header on the screen"]);
  });

  it("measures fixed tap areas with their hitSlop, exempting links inside a line of text", async () => {
    await render(
      <View>
        <Pressable accessibilityRole="button" accessibilityLabel="Small" style={{ width: 36, height: 36 }} onPress={() => undefined} />
        <Pressable accessibilityRole="button" accessibilityLabel="Slopped" style={{ width: 36, height: 36 }} hitSlop={4} onPress={() => undefined} />
        <Pressable accessibilityRole="button" accessibilityLabel="Sides" style={{ height: 36 }} hitSlop={{ top: 2, bottom: 2 }} onPress={() => undefined} />
        <Pressable accessibilityRole="link" style={{ paddingVertical: 4 }} onPress={() => undefined}>
          <Text style={{ fontSize: 14, lineHeight: 20 }}>Chip</Text>
        </Pressable>
        <Text accessibilityRole="link" style={{ fontSize: 16, padding: 14 }} onPress={() => undefined}>
          Lone link
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Content sized" onPress={() => undefined}>
          <View style={{ height: 100 }} />
        </Pressable>
        <Text>
          Inline <Text onPress={() => undefined}>link</Text>
        </Text>
      </View>,
    );
    expect(targetFindings(nodes())).toEqual(['"Small" is 36pt tall', '"Small" is 36pt wide', '"Sides" is 40pt tall', '"Chip" is 28pt tall']);
    expect(tapSize(screen.getByText("Lone link") as TestInstance)).toEqual({ height: 19.2 + 28, width: undefined });
  });

  it("flags text that cannot grow with the text size setting", async () => {
    await render(
      <View>
        <Text allowFontScaling={false}>Frozen</Text>
        <Text maxFontSizeMultiplier={1.1}>Barely</Text>
        <Text maxFontSizeMultiplier={1.3}>Enough</Text>
        <Text maxFontSizeMultiplier={0}>Uncapped</Text>
      </View>,
    );
    expect(scalingFindings(nodes())).toEqual(['"Frozen" does not scale with the text size setting', '"Barely" stops growing at 1.1x']);
  });

  it("reads text against the backgrounds around it, laid over one another, and outlined words by their outline", async () => {
    await render(
      <View style={{ backgroundColor: colors.ink }}>
        <View style={{ backgroundColor: "rgba(248, 245, 239, 0.5)" }}>
          <Text style={{ color: colors.muted, fontSize: 14 }}>On half cream over ink</Text>
        </View>
        <Text style={{ color: colors.onInk }}>Readable</Text>
        <View testID="drawn">
          <Text style={{ color: colors.onInk }}>On a drawn bar</Text>
        </View>
        <View style={{ backgroundColor: colors.canvas }}>
          <Text style={{ color: colors.ink }}>word</Text>
          <Text style={{ color: colors.canvas }}>word</Text>
        </View>
        <Text style={{ color: "papayawhip" }}>Unknown colour</Text>
        <Text>
          <Text style={{ color: colors.golden, fontSize: 30 }}>Gold</Text>
        </Text>
      </View>,
    );
    const findings = contrastFindings(screen.container as TestInstance, colors.canvas, { drawn: colors.canvas });
    // muted on half cream over ink fails; cream on a bar drawn in cream fails; the readable, outlined, unknown and gold-on-ink texts pass or are skipped
    expect(findings).toHaveLength(2);
    expect(findings[0]).toMatch(/^"On half cream over ink" #5f5a52 on #8e8d89 is 2.06:1 at 14pt \(needs 4.5:1\)$/);
    expect(findings[1]).toMatch(/^"On a drawn bar" #f8f5ef on #f8f5ef is 1.00:1/);
    expect(backgroundOf(screen.getByText("Readable") as TestInstance, colors.canvas)).toBe(colors.ink);
  });
});

describe("text sizes", () => {
  it("lets body text grow freely, headings and buttons to 2×, and fixed labels to 1.3×", async () => {
    await render(
      <View>
        <P>Body text</P>
        <H>A heading</H>
        <Button label="Book" onPress={() => undefined} />
        <Button label="In a bar" maxFontSizeMultiplier={MAX_SCALE.fixed} onPress={() => undefined} />
        <Pill>Zero advance</Pill>
        <Sticker>Example</Sticker>
      </View>,
    );
    expect(screen.getByText("Body text")).not.toHaveProp("maxFontSizeMultiplier");
    expect(screen.getByText("A heading")).toHaveProp("maxFontSizeMultiplier", MAX_SCALE.large);
    expect(screen.getByText("Book")).toHaveProp("maxFontSizeMultiplier", MAX_SCALE.large);
    expect(screen.getByText("In a bar")).toHaveProp("maxFontSizeMultiplier", MAX_SCALE.fixed);
    expect(screen.getByText("Zero advance")).toHaveProp("maxFontSizeMultiplier", MAX_SCALE.fixed);
    expect(screen.getByText("Example")).toHaveProp("maxFontSizeMultiplier", MAX_SCALE.fixed);
  });

  it("keeps the bottom nav's labels on one line, growing to 1.3× and shrinking a little to fit a narrow tab", async () => {
    await render(
      <NavStateProvider>
        <BottomNav />
      </NavStateProvider>,
    );
    for (const label of ["Home", "Services", "Colours", "Estimate"]) {
      const text = screen.getByText(label);
      expect(text).toHaveProp("maxFontSizeMultiplier", MAX_SCALE.fixed);
      expect(text).toHaveProp("numberOfLines", 1);
      expect(text).toHaveProp("adjustsFontSizeToFit", true);
      expect(text).toHaveProp("minimumFontScale", 0.8);
    }
  });
});
