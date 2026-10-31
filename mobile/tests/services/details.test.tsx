import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { router } from "expo-router";
import { Linking } from "react-native";

import { accentCity, finderSearchHref, JobSizeTable, ServiceDetails, ServiceShades } from "~/components/services/ServiceDetails";
import { H } from "~/components/ui/Text";
import { FALLBACK_CREDIT } from "~/lib/colours";
import { formatSqft, getPalette, jobSize, services, shadeDisplayName, site, type Palette } from "~/shared";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  usePathname: jest.fn(() => "/"),
  useLocalSearchParams: jest.fn(() => ({})),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
});

describe("accentCity", () => {
  it("accents the city on a city title, else the last word", async () => {
    await render(
      <>
        <H testID="city">{accentCity("Interior Wall Painting Services in Mathura", "Mathura")}</H>
        <H testID="home">{accentCity(`Exterior Painting in ${site.city}`)}</H>
        <H testID="hub">{accentCity("Interior Wall Painting Services")}</H>
        <H testID="one">{accentCity("Painting")}</H>
      </>,
    );
    const em = (id: string) => within(screen.getByTestId(id)).getAllByText(/./).at(-1)!;
    expect(screen.getByTestId("city")).toHaveTextContent("Interior Wall Painting Services in Mathura");
    expect(em("city")).toHaveTextContent("Mathura");
    expect(em("home")).toHaveTextContent(site.city);
    expect(em("hub")).toHaveTextContent("Services");
    expect(em("one")).toHaveTextContent("Painting");
  });

  it("builds the finder search for a shade", () => {
    expect(finderSearchHref({ brand: "asian-paints", code: "8386" })).toBe("/colours?brand=asian-paints&q=8386");
  });
});

describe("JobSizeTable", () => {
  it("lists each home with its paint area, painter-days and crew", async () => {
    const examples = [
      { home: "2 BHK", carpetArea: 900 },
      { home: "3 BHK", carpetArea: 1300 },
    ];
    await render(<JobSizeTable examples={examples} />);
    for (const column of ["Home", "Walls and ceilings", "Typical crew"]) expect(screen.getByText(column)).toBeOnTheScreen();
    for (const e of examples) {
      const j = jobSize(e.carpetArea);
      expect(screen.getByText(e.home)).toBeOnTheScreen();
      expect(screen.getByText(`${formatSqft(j.carpetArea)} carpet`)).toBeOnTheScreen();
      expect(screen.getByText(`about ${formatSqft(j.paintArea)}`)).toBeOnTheScreen();
      expect(screen.getByText(`${j.painterDays} painter-days`)).toBeOnTheScreen();
      expect(screen.getByText(`${j.painters} painters`)).toBeOnTheScreen();
    }
    expect(screen.getByText(/Rule of thumb for a full repaint/)).toBeOnTheScreen();
  });
});

describe("ServiceShades", () => {
  const service = services[0];
  const palettes = service.shades.palettes.map(getPalette).filter((p): p is Palette => p !== undefined);

  it("shows each palette with its shades, opening the finder and the palettes page", async () => {
    await render(<ServiceShades service={service} />);
    expect(screen.getByRole("header", { name: "Shades that suit" })).toBeOnTheScreen();
    expect(palettes.length).toBeGreaterThan(0);
    const [first] = palettes;
    await fireEvent.press(screen.getByRole("link", { name: first.name }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/palettes", params: { section: first.slug } });
    const shade = first.shades[0];
    await fireEvent.press(screen.getAllByRole("link", { name: `${shadeDisplayName(shade.name)} ${shade.code}` })[0]);
    expect(router.push).toHaveBeenCalledWith({ pathname: "/colours", params: { brand: shade.brand, q: shade.code } });
  });

  it("credits PaintDB and links the finder and the combinations", async () => {
    await render(<ServiceShades service={service} />);
    await fireEvent.press(screen.getByRole("link", { name: "PaintDB" }));
    expect(Linking.openURL).toHaveBeenCalledWith("https://paintdb.com");
    await fireEvent.press(screen.getByRole("link", { name: "CC BY 4.0" }));
    expect(Linking.openURL).toHaveBeenCalledWith(FALLBACK_CREDIT.licenseUrl);
    await fireEvent.press(screen.getByRole("link", { name: "Browse every wall colour shade" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/colours", params: {} });
    await fireEvent.press(screen.getByRole("link", { name: "All colour combinations" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/palettes", params: {} });
  });

  it("leaves out a palette slug that no longer exists", async () => {
    await render(<ServiceShades service={{ ...service, shades: { intro: "Try these.", palettes: ["no-such-palette", palettes[0].slug] } }} />);
    expect(screen.getByRole("link", { name: palettes[0].name })).toBeOnTheScreen();
  });
});

describe("ServiceDetails", () => {
  it.each(services.map((s) => [s.name, s] as const))("lays out %s as real sections", async (_name, service) => {
    await render(<ServiceDetails service={service} />);
    const lower = service.name.toLowerCase();
    for (const heading of [`How ${lower} runs, step by step`, "Surface preparation and the paint system", "What affects the cost", "How long it takes", "Aftercare and cleanup"]) {
      expect(screen.getByRole("header", { name: heading })).toBeOnTheScreen();
    }
    for (const p of service.process) expect(screen.getByRole("header", { name: p.step })).toBeOnTheScreen();
    for (const c of service.costFactors) expect(screen.getByText(c.title)).toBeOnTheScreen();
    for (const a of service.aftercare) expect(screen.getByText(a)).toBeOnTheScreen();
    for (const t of service.timeline) expect(screen.getByText(t)).toBeOnTheScreen();
    expect(screen.queryAllByText("Typical crew")).toHaveLength(service.sizeExamples ? 1 : 0);
    await fireEvent.press(screen.getByRole("link", { name: "house painting FAQs" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/faq", params: {} });
  });
});
