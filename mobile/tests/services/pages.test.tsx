import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { Linking } from "react-native";

import { CityPage, cityVisitSteps } from "~/components/services/CityPage";
import { HousePaintingHub } from "~/components/services/HousePainting";
import { findServiceCity, ServiceCity } from "~/components/services/ServiceCity";
import { ServiceHub } from "~/components/services/ServiceHub";
import { ServicesIndex } from "~/components/services/ServicesIndex";
import { areaSlug, cities, getCity, images, liveCities, serviceCityTitle, servicePath, services, servicesIn, site } from "~/shared";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  usePathname: jest.fn(() => "/"),
  useLocalSearchParams: jest.fn(() => ({})),
}));

// The pages scroll to their own anchors through the page (usePage().scrollTo); the rest of Page is real.
const mockScrollTo = jest.fn();
jest.mock("~/components/site/Page", () => {
  const actual = jest.requireActual("~/components/site/Page");
  return { ...actual, usePage: () => ({ ...actual.usePage(), scrollTo: mockScrollTo, register: jest.fn() }) };
});

const pushed = (pathname: string, params: Record<string, string> = {}) => expect(router.push).toHaveBeenCalledWith({ pathname, params });
const agra = getCity("agra")!;
const soonCity = cities.find((c) => c.status === "soon")!;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
});

describe("/services", () => {
  it("shows the hero and every service as a swipe card with its photo, sticker, line and two pills", async () => {
    await render(<ServicesIndex />);
    expect(screen.getByRole("header", { name: "Painting services" })).toBeOnTheScreen();
    expect(screen.getByLabelText(images.uniformSpraying.alt)).toBeOnTheScreen();
    expect(screen.getByLabelText("Services, swipe for more")).toBeOnTheScreen();
    for (const s of services) {
      expect(screen.getByLabelText(s.image.alt)).toBeOnTheScreen();
      expect(screen.getByText(s.shortName)).toBeOnTheScreen();
      expect(screen.getByRole("header", { name: s.name })).toBeOnTheScreen();
    }
    expect(screen.getAllByRole("button", { name: /^Book a site visit for/ })).toHaveLength(services.length);

    const [first] = services;
    await fireEvent.press(screen.getByRole("link", { name: `View ${first.name}` }));
    pushed(servicePath(first));
    await fireEvent.press(screen.getAllByRole("button", { name: /^Book a site visit for/ })[0]);
    pushed("/book", { service: first.slug });
  });

  it("lists each live city with a chip per service page there", async () => {
    await render(<ServicesIndex />);
    expect(screen.getByRole("header", { name: "Services in your city" })).toBeOnTheScreen();
    for (const c of liveCities()) {
      expect(screen.getByRole("header", { name: c.name })).toBeOnTheScreen();
      for (const s of servicesIn(c)) expect(screen.getByRole("link", { name: `${s.name} in ${c.name}` })).toBeOnTheScreen();
    }
    const [first] = services;
    await fireEvent.press(screen.getByRole("link", { name: `${first.name} in ${agra.name}` }));
    pushed(servicePath(first, agra));
    // a city coming soon has no service pages yet
    expect(screen.queryByRole("header", { name: soonCity.name })).toBeNull();
  });

  it("closes with colours, price and where we work", async () => {
    await render(<ServicesIndex />);
    for (const h of ["Choosing colours", "Price and timing", "Where we work"]) expect(screen.getByRole("header", { name: h })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "ready colour combinations" }));
    pushed("/palettes");
    await fireEvent.press(screen.getByRole("link", { name: "wall colour shades by code" }));
    pushed("/colours");
    expect(screen.getByText(new RegExp(`with ${cities.filter((c) => c.status === "soon").map((c) => c.name).join(" and ")} coming next`))).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Let's give your home a fresh coat." })).toBeOnTheScreen();
  });
});

describe("a service hub", () => {
  const service = services[0];
  const lower = service.name.toLowerCase();

  it("shows the hero, includes, details, who it suits and its FAQs", async () => {
    await render(<ServiceHub service={service} />);
    expect(screen.getByRole("header", { name: service.title })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Book a site visit →" }));
    pushed("/book", { service: service.slug });
    expect(screen.getByRole("header", { name: "What's included" })).toBeOnTheScreen();
    for (const inc of service.includes) expect(screen.getByText(inc)).toBeOnTheScreen();
    for (const s of service.suitableFor) expect(screen.getByText(s)).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: `${service.name} FAQs` })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: service.faqs[0].q })).toBeOnTheScreen();
  });

  it("links the cities it is offered in, the other services and every city page", async () => {
    await render(<ServiceHub service={service} />);
    const offered = cities.filter((c) => c.slug in service.local);
    for (const c of offered) {
      await fireEvent.press(screen.getByRole("link", { name: serviceCityTitle(service, c) }));
      pushed(servicePath(service, c));
    }
    for (const o of services.filter((s) => s !== service)) {
      await fireEvent.press(screen.getByRole("link", { name: o.title }));
      pushed(servicePath(o));
    }
    for (const c of cities) expect(screen.getByRole("link", { name: `House painting in ${c.name}` })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Painting FAQs" }));
    pushed("/faq");
  });

  it("jumps to its booking form and closes with its own banner", async () => {
    await render(<ServiceHub service={service} />);
    await fireEvent.press(screen.getByRole("button", { name: "Book a site visit" }));
    expect(mockScrollTo).toHaveBeenCalledWith("book-inspection");
    expect(screen.getByRole("header", { name: `Book ${lower} online` })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Open it here" }));
    pushed("/book", { service: service.slug });
    // the booking form opens on its first step, with the service already added
    expect(screen.getByRole("button", { name: "Continue" })).toBeOnTheScreen();
    expect(screen.getByText("Added to your booking")).toBeOnTheScreen();
    expect(screen.getAllByText(service.leadService).length).toBeGreaterThan(0);
    expect(screen.getByRole("header", { name: `Ready for ${lower}? Book a site visit.` })).toBeOnTheScreen();
  });
});

describe("a service in a city", () => {
  it("finds only the pairs the website has pages for", () => {
    const service = services[0];
    expect(findServiceCity(service.slug, agra.slug)).toEqual({ service, city: agra, local: service.local[agra.slug] });
    expect(findServiceCity("no-such-service", agra.slug)).toBeUndefined();
    expect(findServiceCity(service.slug, "nowhere")).toBeUndefined();
    expect(findServiceCity(service.slug, soonCity.slug)).toBeUndefined();
    expect(findServiceCity(undefined, undefined)).toBeUndefined();
  });

  it("shows the local intro, notes, localities, questions and the quote card", async () => {
    const found = findServiceCity(services[0].slug, agra.slug)!;
    const { service, local } = found;
    const lower = service.name.toLowerCase();
    await render(<ServiceCity {...found} />);
    expect(screen.getByRole("header", { name: serviceCityTitle(service, agra) })).toBeOnTheScreen();
    expect(screen.getByText(local.intro)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: `Book a site visit in ${agra.name} →` }));
    pushed("/book", { service: service.slug });
    await fireEvent.press(screen.getByRole("link", { name: `how we do ${lower}` }));
    pushed(servicePath(service));
    expect(screen.getByRole("header", { name: `${service.name} in ${agra.name}: what to know` })).toBeOnTheScreen();
    for (const n of local.notes) expect(screen.getByRole("header", { name: n.title })).toBeOnTheScreen();
    const area = agra.areas[1];
    await fireEvent.press(screen.getByRole("link", { name: area }));
    pushed(`/services/house-painting/${agra.slug}`, { section: areaSlug(area) });
    await fireEvent.press(screen.getByRole("link", { name: "Book anyway" }));
    pushed("/book", { service: service.slug });
    expect(screen.getByRole("header", { name: `${service.name} in ${agra.name}: questions` })).toBeOnTheScreen();
    expect(screen.getByText(new RegExp(`We call back ${site.hoursDisplay}`))).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Book a site visit" }));
    expect(mockScrollTo).toHaveBeenCalledWith("book-inspection");
    for (const o of servicesIn(agra).filter((s) => s !== service)) {
      await fireEvent.press(screen.getByRole("link", { name: serviceCityTitle(o, agra) }));
      pushed(servicePath(o, agra));
    }
    await fireEvent.press(screen.getByRole("link", { name: `House painting in ${agra.name}` }));
    pushed(`/services/house-painting/${agra.slug}`);
    expect(screen.getByRole("header", { name: `Book ${lower} in ${agra.name}` })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: `Ready for ${lower} in ${agra.name}?` })).toBeOnTheScreen();
  });

  it("leaves out the questions and the side links when a city has none", async () => {
    const base = services[0];
    const city = { ...agra, slug: "testville", name: "Testville" };
    const local = { ...base.local[agra.slug], faqs: [] };
    await render(<ServiceCity service={{ ...base, slug: "test-service", local: { testville: local } }} city={city} local={local} />);
    expect(screen.queryByRole("header", { name: `${base.name} in Testville: questions` })).toBeNull();
    expect(screen.queryByText("More in Testville")).toBeNull();
  });
});

describe("/services/house-painting", () => {
  it("shows the hub with the live cities, every service and every city", async () => {
    await render(<HousePaintingHub />);
    expect(screen.getByRole("header", { name: "House painting services, managed" })).toBeOnTheScreen();
    for (const c of liveCities()) {
      await fireEvent.press(screen.getByRole("link", { name: c.name }));
      pushed(`/services/house-painting/${c.slug}`);
    }
    await fireEvent.press(screen.getAllByRole("button", { name: "Book a site visit" })[0]);
    expect(mockScrollTo).toHaveBeenCalledWith("book-visit");
    expect(screen.getByRole("header", { name: "Book a site visit online" })).toBeOnTheScreen();
    for (const s of services) {
      await fireEvent.press(screen.getByRole("link", { name: s.title }));
      pushed(servicePath(s));
      expect(screen.getByText(s.suitableFor.slice(0, 3).join(" · "))).toBeOnTheScreen();
    }
    expect(screen.getByRole("header", { name: "What you can count on" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "How the work gets done" })).toBeOnTheScreen();
    mockScrollTo.mockClear();
    await fireEvent.press(screen.getAllByRole("button", { name: "Book a site visit" }).at(-1)!);
    expect(mockScrollTo).toHaveBeenCalledWith("book-visit");
    for (const c of cities) {
      await fireEvent.press(screen.getByRole("link", { name: `House painting in ${c.name}` }));
      pushed(`/services/house-painting/${c.slug}`);
    }
    for (const c of liveCities()) expect(screen.getAllByText(`${c.areas.length} localities served. Book a site visit online.`).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Coming soon: join the waitlist.")).toHaveLength(cities.filter((c) => c.status === "soon").length);
    expect(screen.getByRole("header", { name: "Ready to repaint? Book a site visit." })).toBeOnTheScreen();
  });
});

describe("a city page", () => {
  it("jumps to a locality and to the form, and lists the services there", async () => {
    await render(<CityPage city={agra} />);
    expect(screen.getByRole("header", { name: `House painting services in ${agra.name}` })).toBeOnTheScreen();
    expect(screen.getByLabelText(`Jump to a locality in ${agra.name}`)).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole("link", { name: agra.areas[2] })[0]);
    expect(mockScrollTo).toHaveBeenCalledWith(areaSlug(agra.areas[2]));
    await fireEvent.press(screen.getByRole("button", { name: "Book a site visit" }));
    expect(mockScrollTo).toHaveBeenCalledWith("book-visit");
    expect(screen.getByRole("header", { name: `Book a site visit in ${agra.name}` })).toBeOnTheScreen();
    for (const s of servicesIn(agra)) {
      expect(screen.getByText(s.local[agra.slug].intro)).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole("link", { name: `${s.name} in ${agra.name}` }));
      pushed(servicePath(s, agra));
      await fireEvent.press(screen.getByRole("link", { name: serviceCityTitle(s, agra) }));
    }
  });

  it("lists the localities, the visit, the weather and the planning links", async () => {
    await render(<CityPage city={agra} />);
    expect(screen.getByRole("header", { name: `Where we paint in ${agra.name}` })).toBeOnTheScreen();
    for (const a of agra.areas) expect(screen.getByRole("header", { name: a })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: `Book a slot in ${agra.areas[0]}` }));
    pushed("/book");
    await fireEvent.press(screen.getByRole("link", { name: "Book anyway" }));
    pushed("/book");
    expect(screen.getByText(new RegExp(`whether you live in ${agra.areas[0]} or ${agra.areas.at(-1)}`))).toBeOnTheScreen();
    for (const s of cityVisitSteps(agra)) expect(screen.getByRole("header", { name: s.title })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: `What ${agra.name}'s weather means for your walls` })).toBeOnTheScreen();
    const withLink = agra.weather.find((w) => w.link)!;
    await fireEvent.press(screen.getByRole("link", { name: withLink.link!.label }));
    expect(router.push).toHaveBeenCalled();
    for (const [label, path] of [
      ["Colour finder", "/colours"],
      ["Wall colour combinations", "/palettes"],
      ["How we paint homes", "/services/house-painting"],
      ["Painting FAQs", "/faq"],
    ]) {
      await fireEvent.press(screen.getByRole("link", { name: label }));
      pushed(path);
    }
    expect(screen.getByRole("header", { name: `Painting a home in ${agra.name}? Book the visit.` })).toBeOnTheScreen();
  });

  it("has no weather section for a city without weather notes", async () => {
    await render(<CityPage city={{ ...agra, weather: [] }} />);
    expect(screen.queryByRole("header", { name: `What ${agra.name}'s weather means for your walls` })).toBeNull();
  });

  it("is a waitlist for a city coming soon, with a contact form", async () => {
    await render(<CityPage city={soonCity} />);
    expect(screen.getByText("Coming soon")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: `House painting in ${soonCity.name} is coming soon` })).toBeOnTheScreen();
    expect(screen.getByText(soonCity.intro)).toBeOnTheScreen();
    for (const c of liveCities()) expect(screen.getByRole("link", { name: c.name })).toBeOnTheScreen();
    for (const s of services) {
      await fireEvent.press(screen.getByRole("link", { name: s.name.toLowerCase() }));
      pushed(servicePath(s));
    }
    expect(screen.getByRole("header", { name: `Join the ${soonCity.name} waitlist` })).toBeOnTheScreen();
    expect(screen.getByDisplayValue(`Please call me when you start painting in ${soonCity.name}.`)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Send message" })).toBeOnTheScreen();
    expect(screen.queryByRole("header", { name: /Book the visit/ })).toBeNull();
  });
});
