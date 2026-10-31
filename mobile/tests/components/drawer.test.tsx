import { fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { router, usePathname } from "expo-router";
import { Linking, Text } from "react-native";

import { DRAWER_PAGES, isCurrentHref, NavDrawer } from "~/components/site/Drawer";
import { NavStateProvider } from "~/components/site/nav-state";
import { Page } from "~/components/site/Page";
import { areaSlug, cities, cityPath, getCity, navMenus, services, servicePath } from "~/shared";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  usePathname: jest.fn(() => "/"),
  useLocalSearchParams: jest.fn(() => ({})),
}));

const mockPathname = usePathname as jest.Mock;
const agra = getCity("agra")!;
const soon = cities.find((c) => c.status === "soon")!;

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname.mockReturnValue("/");
});

async function openFromHeader() {
  await render(
    <NavStateProvider>
      <Page>
        <Text>content</Text>
      </Page>
    </NavStateProvider>,
  );
  expect(screen.queryByTestId("nav-drawer")).toBeNull();
  const button = screen.getByRole("button", { name: "Open menu" });
  expect(button).not.toBeExpanded();
  await fireEvent.press(button);
  expect(screen.getByTestId("nav-drawer")).toBeOnTheScreen();
}

const closed = () => waitFor(() => expect(screen.queryByTestId("nav-drawer")).toBeNull());
// the footer below has accordions of the same names; on a phone the drawer is the only thing a screen reader reaches (accessibilityViewIsModal)
const drawer = () => within(screen.getByTestId("nav-drawer"));

describe("the navigation drawer", () => {
  it("opens from the header's menu button with the website's menus, the pages and the booking pill", async () => {
    await openFromHeader();
    for (const m of navMenus()) expect(drawer().getByRole("button", { name: m.label })).not.toBeExpanded();
    for (const p of DRAWER_PAGES) expect(drawer().getByRole("link", { name: p.label })).toBeOnTheScreen();
    expect(drawer().getByRole("link", { name: "Book a free inspection" })).toBeOnTheScreen();
    // no numbers in site.ts yet, so no call or WhatsApp pill
    expect(screen.queryByRole("link", { name: "Call us" })).toBeNull();
    expect(screen.queryByRole("link", { name: "WhatsApp us" })).toBeNull();
    expect(screen.getByRole("button", { name: "Open menu" })).toBeExpanded();
  });

  it("opens Services in place and follows a link, closing the drawer", async () => {
    await openFromHeader();
    const section = drawer().getByRole("button", { name: "Services" });
    await fireEvent.press(section);
    expect(section).toBeExpanded();
    expect(screen.getByRole("link", { name: "House painting, Every service, how it works, cities" })).toBeOnTheScreen();
    for (const s of services) expect(drawer().getByRole("link", { name: s.name })).toBeOnTheScreen();
    await fireEvent.press(drawer().getByRole("link", { name: services[0].name }));
    expect(router.push).toHaveBeenCalledWith({ pathname: servicePath(services[0]), params: {} });
    await closed();
  });

  it("collapses a section again, and lists the hub after its links", async () => {
    await openFromHeader();
    await fireEvent.press(drawer().getByRole("button", { name: "Colours" }));
    expect(drawer().getByText("Find a shade")).toBeOnTheScreen();
    expect(drawer().getByText("Shade cards")).toBeOnTheScreen();
    expect(drawer().getByRole("link", { name: "Colour finder, 8,500+ shades by code, name or hex" })).toBeOnTheScreen();
    await fireEvent.press(drawer().getByRole("link", { name: "All colours" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/colours", params: {} });
    await closed();
    await fireEvent.press(screen.getByRole("button", { name: "Open menu" }));
    await fireEvent.press(drawer().getByRole("button", { name: "Colours" }));
    expect(drawer().queryByText("Find a shade")).toBeNull();
  });

  it("lists cities by region, notes those coming soon, and opens a live city's localities one level deeper", async () => {
    await openFromHeader();
    await fireEvent.press(drawer().getByRole("button", { name: "Cities" }));
    for (const region of new Set(cities.map((c) => c.region))) expect(drawer().getAllByText(region).length).toBeGreaterThan(0);
    expect(drawer().getByRole("link", { name: `${soon.name}, Coming soon` })).toBeOnTheScreen();
    // a city we do not paint in yet has no localities to open
    expect(drawer().queryByRole("button", { name: `Localities in ${soon.name}` })).toBeNull();
    const toggle = drawer().getByRole("button", { name: `Localities in ${agra.name}` });
    expect(drawer().queryByRole("link", { name: agra.areas[0] })).toBeNull();
    await fireEvent.press(toggle);
    expect(toggle).toBeExpanded();
    for (const a of agra.areas) expect(drawer().getByRole("link", { name: a })).toBeOnTheScreen();
    await fireEvent.press(drawer().getByRole("link", { name: agra.areas[1] }));
    expect(router.push).toHaveBeenCalledWith({ pathname: cityPath(agra), params: { section: areaSlug(agra.areas[1]) } });
    await closed();
  });

  it("marks the page being viewed and opens its section", async () => {
    mockPathname.mockReturnValue(servicePath(services[1]));
    await render(<NavDrawer open onClose={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Services" })).toBeExpanded();
    expect(screen.getByRole("link", { name: services[1].name })).toBeSelected();
    expect(screen.getByRole("link", { name: services[0].name })).not.toBeSelected();
  });

  it("marks a plain page, and a tap on it only closes the drawer", async () => {
    mockPathname.mockReturnValue("/faq");
    const onClose = jest.fn();
    await render(<NavDrawer open onClose={onClose} />);
    const faq = screen.getByRole("link", { name: "FAQ" });
    expect(faq).toBeSelected();
    expect(screen.getByRole("link", { name: "About" })).not.toBeSelected();
    await fireEvent.press(faq);
    expect(onClose).toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("on a city's own page, glides to a locality on it instead of opening the page again", async () => {
    mockPathname.mockReturnValue(cityPath(agra));
    const scrollTo = jest.fn();
    const onClose = jest.fn();
    await render(<NavDrawer open onClose={onClose} scrollTo={scrollTo} />);
    // its section (Cities) starts open, with the city marked
    expect(screen.getByRole("link", { name: agra.name })).toBeSelected();
    await fireEvent.press(screen.getByRole("button", { name: `Localities in ${agra.name}` }));
    const list = screen.getByLabelText(`${agra.name} localities`);
    await fireEvent.press(within(list).getByRole("link", { name: agra.areas[0] }));
    expect(scrollTo).toHaveBeenCalledWith(areaSlug(agra.areas[0]));
    expect(router.push).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("opens the booking page from its pill", async () => {
    await openFromHeader();
    await fireEvent.press(drawer().getByRole("link", { name: "Book a free inspection" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/book", params: {} });
    await closed();
  });

  it("closes from the close control, the backdrop and Android's back button", async () => {
    await openFromHeader();
    await fireEvent.press(screen.getByRole("button", { name: "Close menu" }));
    await closed();

    await fireEvent.press(screen.getByRole("button", { name: "Open menu" }));
    await fireEvent.press(screen.getByTestId("drawer-backdrop", { includeHiddenElements: true }));
    await closed();

    await fireEvent.press(screen.getByRole("button", { name: "Open menu" }));
    await fireEvent(screen.getByTestId("nav-drawer-modal"), "requestClose");
    await closed();
  });

  it("offers call and WhatsApp once site.ts has the numbers", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    await render(<NavDrawer open onClose={jest.fn()} details={{ phone: "+911234567890", whatsapp: "911234567890" }} />);
    await fireEvent.press(screen.getByRole("link", { name: "Call us" }));
    await fireEvent.press(screen.getByRole("link", { name: "WhatsApp us" }));
    expect(open.mock.calls.map(([url]) => url)).toEqual(["tel:+911234567890", expect.stringMatching(/^https:\/\/wa\.me\/911234567890\?text=/)]);
    expect(screen.getByTestId("whatsapp-logo", { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it("knows the page a menu link points at", () => {
    expect(isCurrentHref("/faq", "/faq")).toBe(true);
    expect(isCurrentHref("/faq", "/about")).toBe(false);
    expect(isCurrentHref(`${cityPath(agra)}#${areaSlug(agra.areas[0])}`, cityPath(agra))).toBe(false);
    expect(isCurrentHref("https://example.com", "/")).toBe(false);
  });
});
