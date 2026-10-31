import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import { Linking, ScrollView, Text, View } from "react-native";

import { activeTab, BottomNav, items } from "~/components/site/BottomNav";
import { Footer } from "~/components/site/Footer";
import { NavStateProvider, useNavState } from "~/components/site/nav-state";
import { Anchor, Container, Page, sectionInView, usePage } from "~/components/site/Page";
import { BookingSection, Breadcrumbs, CtaBanner, FaqList, PageHero, Promises, WorkFlow } from "~/components/site/Sections";
import { webUrl } from "~/lib/config";
import { footerColumns, generalFaqs, images, liveCities, promises, workFlow } from "~/shared";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  usePathname: jest.fn(() => "/"),
  useLocalSearchParams: jest.fn(() => ({})),
}));

const mockPathname = usePathname as jest.Mock;
const mockParams = useLocalSearchParams as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname.mockReturnValue("/");
  mockParams.mockReturnValue({});
});

describe("Breadcrumbs and PageHero", () => {
  it("links every crumb but the last", async () => {
    await render(<Breadcrumbs items={[{ name: "Services", path: "/services" }, { name: "Interior", path: "/services/interior-painting" }]} />);
    await fireEvent.press(screen.getByRole("link", { name: "Home" }));
    expect(router.navigate).toHaveBeenCalledWith("/");
    await fireEvent.press(screen.getByRole("link", { name: "Services" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/services", params: {} });
    expect(screen.queryByRole("link", { name: "Interior" })).toBeNull();
  });

  it("shows the title, intro, extra content and photo", async () => {
    await render(
      <PageHero title="About us" intro="Six years of painting" crumbs={[{ name: "About", path: "/about" }]} image={images.workersTeam}>
        <Text>extra</Text>
      </PageHero>,
    );
    expect(screen.getByRole("header", { name: "About us" })).toBeOnTheScreen();
    expect(screen.getByText("Six years of painting")).toBeOnTheScreen();
    expect(screen.getByText("extra")).toBeOnTheScreen();
    expect(screen.getByLabelText(images.workersTeam.alt)).toBeOnTheScreen();
  });
});

describe("FaqList", () => {
  it("opens and closes answers, with their links", async () => {
    const withLink = generalFaqs.find((f) => f.link)!;
    await render(<FaqList faqs={generalFaqs} openFirst />);
    expect(screen.getByText(generalFaqs[0].a)).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole("button")[0]);
    expect(screen.queryByText(generalFaqs[0].a)).toBeNull();
    const index = generalFaqs.indexOf(withLink);
    await fireEvent.press(screen.getAllByRole("button")[index]);
    await fireEvent.press(screen.getByRole("link", { name: `${withLink.link!.label} →` }));
    expect(router.push).toHaveBeenCalled();
  });
});

describe("Promises", () => {
  it("counts the card in view as the row scrolls, and the last at the end", async () => {
    await render(<Promises />);
    expect(screen.getByText(`1 / ${promises.length}`)).toBeOnTheScreen();
    const row = screen.getByLabelText("Promises, swipe for more");
    const event = (x: number) => ({ nativeEvent: { contentOffset: { x, y: 0 }, contentSize: { width: 2000, height: 100 }, layoutMeasurement: { width: 390, height: 100 } } });
    await fireEvent.scroll(row, event(298));
    expect(screen.getByText(`2 / ${promises.length}`)).toBeOnTheScreen();
    await fireEvent.scroll(row, event(1610));
    expect(screen.getByText(`${promises.length} / ${promises.length}`)).toBeOnTheScreen();
    await fireEvent.scroll(row, event(1610));
    for (const p of promises) expect(screen.getByText(p.title)).toBeOnTheScreen();
  });

  it("can drop its heading", async () => {
    await render(<Promises heading={false} />);
    expect(screen.queryByRole("header", { name: "What you can count on" })).toBeNull();
    expect(screen.getByLabelText("What you can count on")).toBeOnTheScreen();
  });
});

describe("WorkFlow", () => {
  it("numbers the steps and runs its button", async () => {
    const onPress = jest.fn();
    const steps = [...workFlow.slice(0, 2), { ...workFlow[2], image: { src: images.uniformCeiling.src, alt: images.uniformCeiling.alt } }];
    await render(<WorkFlow steps={steps} cta={{ label: "Book a site visit", onPress }} />);
    expect(screen.getByRole("header", { name: "How the work gets done" })).toBeOnTheScreen();
    for (const s of steps) expect(screen.getByText(s.title)).toBeOnTheScreen();
    expect(screen.getByLabelText(images.uniformCeiling.alt)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Book a site visit" }));
    expect(onPress).toHaveBeenCalled();
  });
});

describe("CtaBanner and BookingSection", () => {
  it("closes the page with the estimate and contact buttons", async () => {
    await render(<CtaBanner />);
    expect(screen.getByRole("header", { name: "Let's give your home a fresh coat." })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Get a free estimate" }));
    await fireEvent.press(screen.getByRole("button", { name: "Talk to us" }));
    expect((router.push as jest.Mock).mock.calls.map(([r]) => r.pathname)).toEqual(["/book", "/contact"]);
  });

  it("takes a custom heading and sits flush after the FAQ", async () => {
    await render(<CtaBanner heading="Ready?" flushTop />);
    expect(screen.getByRole("header", { name: "Ready?" })).toBeOnTheScreen();
  });

  it("holds the booking form with its heading, text and note", async () => {
    await render(<BookingSection heading="Book a free inspection" text="We call back." note="Zero advance payment." />);
    expect(screen.getByRole("header", { name: "Book a free inspection" })).toBeOnTheScreen();
    expect(screen.getByText("We call back.")).toBeOnTheScreen();
    expect(screen.getByText("Zero advance payment.")).toBeOnTheScreen();
    // the booking form opens on its first step (tests/components/lead-form.test.tsx)
    expect(screen.getByRole("progressbar")).toHaveAccessibilityValue({ now: 1, max: 2 });
    expect(screen.getByRole("button", { name: "Continue" })).toBeOnTheScreen();
  });

  it("takes rich text and the contact form", async () => {
    await render(<BookingSection heading="Join the waitlist" text={<Text>rich</Text>} type="contact" defaultMessage="Delhi NCR" />);
    expect(screen.getByText("rich")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Send message" })).toBeOnTheScreen();
  });
});

describe("Page", () => {
  function Jump() {
    const { scrollTo } = usePage();
    return <Text onPress={() => scrollTo("faq")}>jump</Text>;
  }

  it("has the header linking home, the content and the footer", async () => {
    await render(
      <NavStateProvider>
        <Page testID="p">
          <Container>
            <Text>content</Text>
          </Container>
        </Page>
      </NavStateProvider>,
    );
    expect(screen.getByText("content")).toBeOnTheScreen();
    expect(screen.getByTestId("footer")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Paint Saathi home" }));
    expect(router.navigate).toHaveBeenCalledWith("/");
  });

  it("can leave the footer out, and scrolls to anchors (on request and from a section param)", async () => {
    mockParams.mockReturnValue({ section: "faq" });
    await render(
      <NavStateProvider>
        <Page footer={false}>
          <Anchor id="faq">
            <Text>faq</Text>
          </Anchor>
          <Jump />
        </Page>
      </NavStateProvider>,
    );
    expect(screen.queryByTestId("footer")).toBeNull();
    await fireEvent(screen.getByText("faq").parent!.parent!, "layout", { nativeEvent: { layout: { x: 0, y: 500, width: 390, height: 100 } } });
    await fireEvent.press(screen.getByText("jump"));
    expect(screen.getByText("faq")).toBeOnTheScreen();
  });

  it("registers anchors and jumps to the one named by the section param", async () => {
    mockParams.mockReturnValue({ section: "localities" });
    function Register() {
      const { register, scrollTo } = usePage();
      return <Text onPress={() => (register("localities", 1200, 112), register("weather", 1800), scrollTo("weather"), scrollTo("localities"), scrollTo("missing"))}>register</Text>;
    }
    await render(
      <NavStateProvider>
        <Page>
          <Register />
        </Page>
      </NavStateProvider>,
    );
    await fireEvent.press(screen.getByText("register"));
    expect(screen.getByText("register")).toBeOnTheScreen();
  });

  it("finds the section in view: the last whose top passed 55% of the screen", () => {
    const anchors = new Map([["top", 73], ["services", 1500], ["colour", 3000]]);
    const ids = ["top", "services", "colour", "book"];
    expect(sectionInView(anchors, ids, 0, 800)).toBe(0);
    expect(sectionInView(anchors, ids, 1100, 800)).toBe(1);
    expect(sectionInView(anchors, ids, 2700, 800)).toBe(2);
    expect(sectionInView(new Map(), ids, 5000, 800)).toBe(0);
  });

  it("on the home page, reports the section in view to the bottom nav", async () => {
    let state: ReturnType<typeof useNavState> | undefined;
    function Probe() {
      state = useNavState();
      return null;
    }
    await render(
      <NavStateProvider>
        <Probe />
        <Page sections={["top", "services"]} testID="home">
          <View />
        </Page>
      </NavStateProvider>,
    );
    expect(typeof state!.scrollHome).toBe("function");
    const scroller = screen.getByTestId("home").children[0] as never;
    await fireEvent.scroll(scroller, { nativeEvent: { contentOffset: { x: 0, y: 900 } } });
    expect(state!.homeSection).toBe(0);
    await act(() => state!.scrollHome!("services"));
  });
});

describe("Footer", () => {
  it("opens each link column and follows its links", async () => {
    const [first] = footerColumns();
    await render(<Footer />);
    expect(screen.getByText("har ghar ka paint saathi")).toBeOnTheScreen();
    expect(screen.queryByRole("link", { name: first.links[0].label })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: first.heading }));
    await fireEvent.press(screen.getByRole("link", { name: first.links[0].label }));
    expect(router.push).toHaveBeenCalledWith({ pathname: first.links[0].href, params: {} });
    await fireEvent.press(screen.getByRole("button", { name: first.heading }));
    expect(screen.queryByRole("link", { name: first.links[0].label })).toBeNull();
    for (const c of liveCities()) expect(screen.getByText(new RegExp(`Painting in ${c.name}:`))).toBeOnTheScreen();
  });

  it("is an accordion: one column open at a time, each row a tall button with its expanded state", async () => {
    const [first, second] = footerColumns();
    await render(<Footer />);
    const a = screen.getByRole("button", { name: first.heading });
    const b = screen.getByRole("button", { name: second.heading });
    expect(a).toHaveStyle({ minHeight: 56 });
    await fireEvent.press(a);
    expect(a).toBeExpanded();
    expect(screen.getByRole("link", { name: first.links[0].label })).toBeOnTheScreen();
    // opening the next closes the first, whose links leave screen readers at once
    await fireEvent.press(b);
    expect(b).toBeExpanded();
    expect(a).not.toBeExpanded();
    expect(screen.queryByRole("link", { name: first.links[0].label })).toBeNull();
    expect(screen.getByRole("link", { name: second.links[0].label })).toBeOnTheScreen();
  });

  it("ends with Back to top, which scrolls the page to its top", async () => {
    const scrollTo = (ScrollView.prototype as unknown as { scrollTo: jest.Mock }).scrollTo;
    await render(
      <NavStateProvider>
        <Page>
          <Text>content</Text>
        </Page>
      </NavStateProvider>,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Back to top" }));
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
  });

  it("shows the phone, email and street once the business details have them", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    const details = { address: { street: "12 MG Road", locality: "Agra", postalCode: "282001" }, city: "Agra", region: "Uttar Pradesh", hoursDisplay: "Mon–Sat", phone: "+911234567890", phoneDisplay: "", email: "hi@example.com" };
    await render(<Footer details={details} />);
    expect(screen.getByText("12 MG Road, Agra 282001")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "+911234567890" }));
    await fireEvent.press(screen.getByRole("link", { name: "hi@example.com" }));
    expect(open.mock.calls).toEqual([["tel:+911234567890"], ["mailto:hi@example.com"]]);
  });

  it("links the legal pages and staff login", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    await render(<Footer />);
    await fireEvent.press(screen.getByRole("link", { name: "Privacy policy" }));
    await fireEvent.press(screen.getByRole("link", { name: "Terms of service" }));
    await fireEvent.press(screen.getByRole("link", { name: "Staff login" }));
    expect((router.push as jest.Mock).mock.calls.map(([r]) => r.pathname)).toEqual(["/privacy-policy", "/terms"]);
    expect(open).toHaveBeenCalledWith(webUrl("/admin"));
  });
});

describe("BottomNav", () => {
  it("picks the tab for a path, and the section in view on the home page", () => {
    expect(activeTab("/", 2)).toBe(2);
    expect(activeTab("/services/interior-painting/agra", 0)).toBe(1);
    expect(activeTab("/shade-cards/berger", 0)).toBe(2);
    expect(activeTab("/palettes", 0)).toBe(2);
    expect(activeTab("/contact", 0)).toBe(3);
    expect(activeTab("/about", 3)).toBe(0);
    expect(items.map((i) => i.label)).toEqual(["Home", "Services", "Colours", "Estimate"]);
  });

  it("shows four tabs and opens a tab's page from another page", async () => {
    mockPathname.mockReturnValue("/about");
    await render(
      <NavStateProvider>
        <BottomNav />
      </NavStateProvider>,
    );
    await fireEvent(screen.getByTestId("bottom-nav"), "layout", { nativeEvent: { layout: { x: 16, y: 700, width: 361, height: 64 } } });
    expect(screen.getByRole("tab", { name: "Home" })).toBeSelected();
    expect(screen.getByTestId("bottom-nav-dab")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("tab", { name: "Services" }));
    expect(router.navigate).toHaveBeenCalledWith("/services");
    await fireEvent.press(screen.getByRole("tab", { name: "Home" }));
    expect(router.navigate).toHaveBeenLastCalledWith("/");
  });

  it("on the home page glides to the tab's section, and Estimate opens the booking page", async () => {
    const scrollHome = jest.fn();
    function Register() {
      const { setScrollHome, setHomeSection } = useNavState();
      return <Text onPress={() => (setScrollHome(scrollHome), setHomeSection(1))}>register</Text>;
    }
    await render(
      <NavStateProvider>
        <Register />
        <BottomNav />
      </NavStateProvider>,
    );
    await fireEvent.press(screen.getByText("register"));
    expect(screen.getByRole("tab", { name: "Services" })).toBeSelected();
    await fireEvent.press(screen.getByRole("tab", { name: "Colours" }));
    expect(scrollHome).toHaveBeenCalledWith("colour");
    await fireEvent.press(screen.getByRole("tab", { name: "Estimate" }));
    expect(router.navigate).toHaveBeenCalledWith("/book");
  });

  it("does nothing for the tab of the page already open", async () => {
    mockPathname.mockReturnValue("/services");
    await render(
      <NavStateProvider>
        <BottomNav />
      </NavStateProvider>,
    );
    await fireEvent.press(screen.getByRole("tab", { name: "Services" }));
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
