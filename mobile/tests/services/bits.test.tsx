import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { Linking, Text } from "react-native";

import {
  accentColours,
  ArrowLink,
  BlockLink,
  CreamHero,
  GradientWord,
  LiveCityLinks,
  LocalityChip,
  NotFound,
  SectionHead,
  ServiceSticker,
  TextLink,
  Tick,
  warmAt,
} from "~/components/services/bits";
import { H } from "~/components/ui/Text";
import { webUrl } from "~/lib/config";
import { contrast, goldenText } from "~/lib/contrast";
import { liveCities, services } from "~/shared";
import { colors } from "~/theme";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  usePathname: jest.fn(() => "/"),
  useLocalSearchParams: jest.fn(() => ({})),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
});

describe("the warm gradient word", () => {
  it("runs sage → terracotta-light → the text golden and stays inside the gradient", () => {
    expect(warmAt(0)).toBe(colors.sage);
    expect(warmAt(0.5)).toBe(colors.terracottaLight);
    expect(warmAt(1)).toBe(goldenText);
    expect(warmAt(-1)).toBe(colors.sage);
    expect(warmAt(2)).toBe(goldenText);
    // every letter reads at 3:1 or more, the large-text minimum
    for (let t = 0; t <= 1; t += 0.02) expect(contrast(warmAt(t), colors.canvas)).toBeGreaterThanOrEqual(3);
  });

  it("keeps the word as one readable heading", async () => {
    await render(
      <H>
        What&apos;s <GradientWord>included</GradientWord>
      </H>,
    );
    expect(screen.getByRole("header", { name: "What's included" })).toBeOnTheScreen();
  });
});

describe("service stickers", () => {
  it("reads each service's accent classes, with the plain sticker as the fallback", () => {
    expect(accentColours("bg-terracotta text-on-ink")).toEqual({ background: colors.terracotta, text: colors.onInk });
    expect(accentColours("bg-golden text-ink")).toEqual({ background: colors.golden, text: colors.ink });
    expect(accentColours("bg-sage-deep text-on-ink").background).toBe(colors.sageDeep);
    expect(accentColours("")).toEqual({ background: "rgba(248, 245, 239, 0.9)", text: colors.ink });
    for (const s of services) expect(accentColours(s.accent).background).not.toBe("rgba(248, 245, 239, 0.9)");
  });

  it("shows the service's short name", async () => {
    await render(<ServiceSticker service={services[0]} />);
    expect(screen.getByText(services[0].shortName)).toBeOnTheScreen();
  });
});

describe("links", () => {
  it("opens website paths as app screens and other links in the browser", async () => {
    await render(
      <>
        <Text>
          See <TextLink href="/faq">the FAQs</TextLink>
        </Text>
        <TextLink href="https://paintdb.com">PaintDB</TextLink>
        <BlockLink href="/palettes" label="All colour combinations" />
        <ArrowLink label="Book a slot" spoken="Book a slot in Tajganj" onPress={() => router.push("/book" as never)} />
      </>,
    );
    await fireEvent.press(screen.getByRole("link", { name: "the FAQs" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/faq", params: {} });
    await fireEvent.press(screen.getByRole("link", { name: "PaintDB" }));
    expect(Linking.openURL).toHaveBeenCalledWith("https://paintdb.com");
    await fireEvent.press(screen.getByRole("link", { name: "All colour combinations" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/palettes", params: {} });
    await fireEvent.press(screen.getByRole("link", { name: "Book a slot in Tajganj" }));
    expect(router.push).toHaveBeenCalledWith("/book");
  });

  it("names the live cities with links to their pages", async () => {
    await render(
      <Text>
        We paint in <LiveCityLinks conjunction="or" />
      </Text>,
    );
    const live = liveCities();
    for (const c of live) {
      await fireEvent.press(screen.getByRole("link", { name: c.name }));
      expect(router.push).toHaveBeenLastCalledWith({ pathname: `/services/house-painting/${c.slug}`, params: {} });
    }
    expect(screen.getByText(`We paint in ${live.slice(0, -1).map((c) => c.name).join(", ")} or ${live.at(-1)!.name}`)).toBeOnTheScreen();
  });

  it("presses a locality chip", async () => {
    const onPress = jest.fn();
    await render(<LocalityChip name="Tajganj" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("link", { name: "Tajganj" }));
    expect(onPress).toHaveBeenCalled();
  });
});

describe("small layouts", () => {
  it("renders ticks, the cream hero and a section head", async () => {
    await render(
      <>
        <CreamHero crumbs={[{ name: "Services", path: "/services" }]} rule={false}>
          <SectionHead eyebrow="Cities">House painting by city</SectionHead>
        </CreamHero>
        <Tick size={14} leading={20} weight="semibold" gap={8}>
          Furniture protection
        </Tick>
      </>,
    );
    expect(screen.getByText("Cities")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "House painting by city" })).toBeOnTheScreen();
    expect(screen.getByText("Furniture protection")).toBeOnTheScreen();
  });

  it("shows the website's 404 with its links and buttons", async () => {
    await render(<NotFound />);
    expect(screen.getByRole("header", { name: "Page not found." })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Painting services" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/services", params: {} });
    await fireEvent.press(screen.getByRole("button", { name: "Back to home" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/", params: {} });
    await fireEvent.press(screen.getByRole("button", { name: "Book an inspection" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/book", params: {} });
    expect(Linking.openURL).not.toHaveBeenCalledWith(webUrl("/book"));
  });
});
