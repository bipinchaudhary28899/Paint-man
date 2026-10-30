import { fireEvent, render, screen } from "@testing-library/react-native";
import type { BottomTabBarProps } from "expo-router/tabs";
import { Linking, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Button } from "~/components/Button";
import { Card } from "~/components/Card";
import { ContactActions } from "~/components/ContactActions";
import { CityCards, cityStatus, ServiceList, ServiceTiles } from "~/components/Directory";
import { FaqList } from "~/components/FaqList";
import { DashList, PointList, StepList } from "~/components/Lists";
import { Art, Photo, Wordmark } from "~/components/Media";
import { Screen, Section } from "~/components/Screen";
import { TabBar } from "~/components/TabBar";
import { Accent, AccentLast, Body, Eyebrow, Heading, Muted, Strong } from "~/components/Text";
import { cities, generalFaqs, illustrations, images, services } from "~/shared";

const metrics = { frame: { x: 0, y: 0, width: 402, height: 874 }, insets: { top: 62, left: 0, right: 0, bottom: 34 } };
const withInsets = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

describe("type", () => {
  it("marks headings as headers and keeps the accent word inside them", async () => {
    await render(
      <>
        <Heading level={1}>
          Find your <Accent>shade</Accent>
        </Heading>
        <Heading level={3}>
          <AccentLast text="Interior Wall Painting Services" />
        </Heading>
        <Heading>
          <AccentLast text="Rental" />
        </Heading>
        <Body>
          Body <Strong>bold</Strong>
        </Body>
        <Muted>muted</Muted>
        <Eyebrow>eyebrow</Eyebrow>
      </>,
    );
    expect(screen.getByRole("header", { name: "Find your shade" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Interior Wall Painting Services" })).toBeOnTheScreen();
    expect(screen.getByText("Services")).toBeOnTheScreen();
    expect(screen.getByText("Rental")).toBeOnTheScreen();
  });
});

describe("Button", () => {
  it("presses, and while busy shows its busy label and ignores presses", async () => {
    const onPress = jest.fn();
    const { rerender } = await render(<Button label="Book my inspection" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Book my inspection" }));
    expect(onPress).toHaveBeenCalledTimes(1);
    await rerender(<Button label="Book my inspection" busyLabel="Sending…" busy onPress={onPress} />);
    expect(screen.getByRole("button", { name: "Sending…" })).toBeBusy();
    await rerender(<Button label="Save" variant="secondary" disabled onPress={onPress} />);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    await rerender(<Button label="Saving" variant="secondary" busy onPress={onPress} />);
    expect(screen.getByRole("button", { name: "Saving" })).toBeBusy();
  });
});

describe("FaqList", () => {
  it("opens one answer at a time", async () => {
    const [first, second] = generalFaqs;
    await render(<FaqList items={generalFaqs} />);
    expect(screen.queryByText(first.a)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: new RegExp(first.q.replace(/[?()]/g, ".")) }));
    expect(screen.getByText(first.a)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: new RegExp(second.q.replace(/[?()]/g, ".")) }));
    expect(screen.queryByText(first.a)).toBeNull();
    expect(screen.getByText(second.a)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: new RegExp(second.q.replace(/[?()]/g, ".")) }));
    expect(screen.queryByText(second.a)).toBeNull();
  });
});

describe("lists", () => {
  it("render steps, points and dashed lines", async () => {
    await render(
      <>
        <StepList steps={[{ title: "Book online", text: "Name and address" }, { title: "We call", body: "In hours" }]} />
        <PointList points={[{ title: "Zero advance payment", text: "Nothing up front" }, { title: "Damp", body: "Checked" }]} />
        <DashList items={["Flats", "Shops"]} />
        <Card tone="sand">
          <Text>card</Text>
        </Card>
      </>,
    );
    for (const t of ["1", "2", "Book online", "In hours", "Zero advance payment", "Checked", "Flats", "card"]) expect(screen.getByText(t)).toBeOnTheScreen();
  });
});

describe("ContactActions", () => {
  it("renders nothing without numbers", async () => {
    await render(<ContactActions />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("opens the call and WhatsApp links", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    await render(
      <ContactActions
        links={[
          { kind: "call", label: "Call us", url: "tel:+911" },
          { kind: "whatsapp", label: "WhatsApp us", url: "https://wa.me/911" },
        ]}
      />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "WhatsApp us" }));
    expect(open).toHaveBeenCalledWith("https://wa.me/911");
  });
});

describe("Directory", () => {
  it("opens a service from the tiles and the list", async () => {
    const onOpen = jest.fn();
    await render(
      <>
        <ServiceTiles services={services.slice(0, 1)} onOpen={onOpen} />
        <ServiceList services={services.slice(1, 2)} onOpen={onOpen} />
      </>,
    );
    await fireEvent.press(screen.getByRole("link", { name: services[0].name }));
    await fireEvent.press(screen.getByRole("link", { name: services[1].name }));
    expect(onOpen.mock.calls).toEqual([[services[0].slug], [services[1].slug]]);
    expect(screen.getByLabelText(services[0].image.alt)).toBeOnTheScreen();
  });

  it("lists live cities first with their localities, then the cities coming soon", async () => {
    const onOpen = jest.fn();
    const soon = cities.find((c) => c.status === "soon")!;
    const live = cities.find((c) => c.status === "live")!;
    const many = { ...live, slug: "many", areas: ["A", "B", "C", "D", "E"] };
    await render(<CityCards cities={[soon, live, many]} onOpen={onOpen} />);
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveProp("accessibilityLabel", `${live.name}, ${cityStatus(live)}`);
    expect(links[2]).toHaveProp("accessibilityLabel", `${soon.name}, Coming soon`);
    expect(screen.getByText("A, B, C, D…")).toBeOnTheScreen();
    await fireEvent.press(links[2]);
    expect(onOpen).toHaveBeenCalledWith(soon.slug);
    expect(cityStatus(live)).toBe(`Now painting · ${live.areas.length} localities`);
  });
});

describe("Media", () => {
  it("labels photos, illustrations and the logo for screen readers", async () => {
    await render(
      <>
        <Photo image={images.uniformCeiling} />
        <Art art={illustrations.paintCan} />
        <Wordmark />
      </>,
    );
    expect(screen.getByLabelText(images.uniformCeiling.alt)).toBeOnTheScreen();
    expect(screen.getByLabelText(illustrations.paintCan.alt)).toBeOnTheScreen();
    expect(screen.getByLabelText("Paint Saathi")).toBeOnTheScreen();
  });
});

describe("Screen", () => {
  it("scrolls its sections below the status bar or a header", async () => {
    const { rerender } = await render(
      withInsets(
        <Screen testID="s">
          <Section first>
            <Text>one</Text>
          </Section>
          <Section>
            <Text>two</Text>
          </Section>
        </Screen>,
      ),
    );
    expect(screen.getByTestId("s")).toHaveProp("contentContainerStyle", expect.arrayContaining([{ paddingTop: 74 }]));
    expect(screen.getByTestId("status-bar-backing")).toHaveStyle({ height: 62 });
    await rerender(
      withInsets(
        <Screen testID="s" underHeader>
          <Text>one</Text>
        </Screen>,
      ),
    );
    expect(screen.getByTestId("s")).toHaveProp("contentContainerStyle", expect.arrayContaining([{ paddingTop: 12 }]));
    expect(screen.queryByTestId("status-bar-backing")).toBeNull();
  });
});

describe("TabBar", () => {
  const routes = ["index", "services", "colours", "book", "other"].map((name) => ({ key: `${name}-key`, name }));
  const titles: Record<string, string | undefined> = { index: "Home", services: "Services", colours: "Colours", book: "Estimate" };
  const descriptors = Object.fromEntries(routes.map((r) => [r.key, { options: { title: titles[r.name] } }]));

  function setup(prevented = false) {
    const emit = jest.fn(() => ({ defaultPrevented: prevented }));
    const navigateToTab = jest.fn();
    const props = { state: { index: 0, routes }, descriptors, emitter: { emit }, navigateToTab, insets: metrics.insets } as unknown as BottomTabBarProps;
    return { props, emit, navigateToTab };
  }

  it("shows the four tabs with the current one selected, and switches tab on press", async () => {
    const { props, emit, navigateToTab } = setup();
    await render(withInsets(<TabBar {...props} />));
    expect(screen.getByRole("tab", { name: "Home" })).toBeSelected();
    expect(screen.getByRole("tab", { name: "other" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("tab", { name: "Colours" }));
    expect(emit).toHaveBeenCalledWith({ type: "tabPress", target: "colours-key", canPreventDefault: true });
    expect(navigateToTab).toHaveBeenCalledWith("colours-key");
    await fireEvent.press(screen.getByRole("tab", { name: "Home" }));
    expect(navigateToTab).toHaveBeenCalledTimes(1);
  });

  it("leaves the tab alone when a listener prevents the press", async () => {
    const { props, navigateToTab } = setup(true);
    await render(withInsets(<TabBar {...props} />));
    await fireEvent.press(screen.getByRole("tab", { name: "Estimate" }));
    expect(navigateToTab).not.toHaveBeenCalled();
  });
});
