import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { router } from "expo-router";
import { Linking } from "react-native";

import { AboutModel, principles, Principles, WhereWeWork } from "~/components/content/About";
import { BookForm, BookingFaq, BookingSteps, NextSteps, PreferToTalk } from "~/components/content/Book";
import { AfterContact, ContactHeroActions, contactRows, ContactRows, Coverage, SendMessage } from "~/components/content/Contact";
import { FaqDirectory } from "~/components/content/Faq";
import { GalleryGrid, GalleryGroups, GalleryNav, GalleryNote, GalleryPreview } from "~/components/content/Gallery";
import { ErrorNotice, NotFoundContent, ScreenError } from "~/components/content/NotFound";
import { ProseH2, ProseList, ProseP, ProsePage } from "~/components/content/Prose";
import { notSentCopy, projectParam, sentCopy, ThankYou, thankYouType, wasSent, webActions } from "~/components/content/ThankYou";
import { NavStateProvider } from "~/components/site/nav-state";
import { webUrl } from "~/lib/config";
import { contactLinks, whatsappUrl } from "~/lib/contact";
import { bookingFaqs, bookingSteps, cityPath, galleryGroups, generalFaqs, illustrations, images, liveCities, palettes, services, site, WHATSAPP_GREETING } from "~/shared";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  usePathname: jest.fn(() => "/"),
  useLocalSearchParams: jest.fn(() => ({})),
}));
// the gallery's colour preview draws the room with Skia
jest.mock("@shopify/react-native-skia", () => require("../colours/skia-mock"));

const mockScrollTo = jest.fn();
jest.mock("~/components/site/Page", () => {
  const actual = jest.requireActual("~/components/site/Page");
  return { ...actual, usePage: () => ({ ...actual.usePage(), scrollTo: mockScrollTo, register: jest.fn() }) };
});

jest.mock("~/lib/contact", () => {
  const actual = jest.requireActual("~/lib/contact");
  return { ...actual, contactLinks: jest.fn(actual.contactLinks) };
});

const pushed = () => (router.push as jest.Mock).mock.calls.map(([r]) => (typeof r === "string" ? r : r.pathname + (r.params.section ? `#${r.params.section}` : "")));
const live = liveCities();
let openURL: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
});

describe("about", () => {
  it("explains the model beside the team photo", async () => {
    await render(<AboutModel />);
    expect(screen.getByRole("header", { name: "A managed service, not a directory" })).toBeOnTheScreen();
    expect(screen.getByText(/We have been painting homes for 6 years/)).toBeOnTheScreen();
    expect(screen.getByLabelText(images.workersTeam.alt)).toBeOnTheScreen();
  });

  it("lists the four principles on their tints", async () => {
    await render(<Principles />);
    for (const p of principles) expect(screen.getByRole("header", { name: p.title })).toBeOnTheScreen();
    expect(new Set(principles.map((p) => p.tint)).size).toBe(4);
  });

  it("lists every live city's localities with a link to them", async () => {
    await render(<WhereWeWork />);
    expect(screen.getByRole("header", { name: "Where we work" })).toBeOnTheScreen();
    for (const c of live) expect(screen.getByText(c.areas.join(" · "))).toBeOnTheScreen();
    for (const c of live) await fireEvent.press(screen.getByRole("link", { name: `How we work in ${c.name}` }));
    expect(pushed()).toEqual(live.map((c) => `${cityPath(c)}#localities`));
  });
});

describe("faq", () => {
  it("groups the general and each service's questions, with links to each service", async () => {
    await render(<FaqDirectory />);
    for (const name of ["General", ...services.map((s) => s.name), "Choosing colours"]) expect(screen.getByRole("header", { name })).toBeOnTheScreen();
    expect(screen.getByText(generalFaqs[0].q)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: `How ${services[0].name.toLowerCase()} works →` }));
    await fireEvent.press(screen.getByRole("link", { name: "ready colour combinations" }));
    await fireEvent.press(screen.getByRole("link", { name: "wall colour shades by code" }));
    expect(pushed()).toEqual([`/services/${services[0].slug}`, "/palettes", "/colours"]);
  });
});

describe("gallery", () => {
  it("says the homes are examples, and jumps to each group from its chip", async () => {
    await render(
      <>
        <GalleryNote />
        <GalleryNav />
      </>,
    );
    expect(screen.getByText(/These are example homes for ideas, not our own jobs/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: galleryGroups[1].title }));
    expect(mockScrollTo).toHaveBeenCalledWith(`${galleryGroups[1].id}-heading`);
  });

  it("shows the colour preview above the ideas, then every photo with its alt text and caption", async () => {
    await render(<GalleryGroups />);
    expect(screen.getByRole("header", { name: "Try a shade on an example room" })).toBeOnTheScreen();
    expect(screen.getAllByRole("header")).toHaveLength(galleryGroups.length + 1);
    expect(screen.getByRole("adjustable", { name: /^Colour preview on an example room/ })).toBeOnTheScreen();
    expect(screen.getByText(/not a finished job of ours/)).toBeOnTheScreen();
    for (const g of galleryGroups) {
      expect(screen.getByRole("header", { name: g.title })).toBeOnTheScreen();
      for (const p of g.photos) {
        expect(screen.getByLabelText(p.alt)).toHaveStyle({ aspectRatio: p.width / p.height });
        expect(screen.getByText(p.caption)).toBeOnTheScreen();
      }
    }
  });

  it("spaces every group after the first, and can leave the preview out", async () => {
    await render(<GalleryGrid group={galleryGroups[0]} />);
    expect(screen.getByRole("header", { name: galleryGroups[0].title })).toBeOnTheScreen();
    await render(<GalleryGroups preview={false} />);
    expect(screen.queryByRole("header", { name: "Try a shade on an example room" })).toBeNull();
  });

  it("books an inspection with the shade on the preview", async () => {
    await render(<GalleryPreview />);
    await fireEvent.press(screen.getByRole("button", { name: /^Scuba Blue/ }));
    await fireEvent.press(screen.getByRole("button", { name: "Book a free site visit with this shade" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/book", params: { shade: "asian-paints:7273" } });
  });
});

const details = { ...site, phone: "", phoneDisplay: "", whatsapp: "", email: "", address: { ...site.address, street: "", postalCode: "" } };

describe("contact", () => {
  it("offers a call back on the page while the website has no numbers", async () => {
    await render(<ContactHeroActions details={details} />);
    await fireEvent.press(screen.getByRole("link", { name: "Book a free site visit" }));
    await fireEvent.press(screen.getByRole("link", { name: "Ask for a call back" }));
    expect(pushed()).toEqual(["/book"]);
    expect(mockScrollTo).toHaveBeenCalledWith("send-message");
  });

  it("reads today's details from the website by default", async () => {
    await render(
      <>
        <ContactHeroActions />
        <ContactRows />
        <PreferToTalk />
      </>,
    );
    // the website lists a WhatsApp number (no phone yet): the hero chats, the row shows the number, the box offers it
    expect(screen.getByRole("link", { name: "Chat on WhatsApp" })).toBeOnTheScreen();
    expect(screen.queryByRole("link", { name: "Ask for a call back" })).toBeNull();
    expect(screen.getByText(site.whatsappDisplay)).toBeOnTheScreen();
    expect(screen.getByText(site.hoursDisplay)).toBeOnTheScreen();
    expect(screen.getByText("Prefer to talk?")).toBeOnTheScreen();
    expect(screen.getByText(`WhatsApp, ${site.whatsappDisplay}`)).toBeOnTheScreen();
  });

  it("asks for a call back, and offers one from the form, while the website has no numbers", async () => {
    await render(
      <>
        <ContactHeroActions details={details} />
        <PreferToTalk details={details} />
      </>,
    );
    expect(screen.getByRole("link", { name: "Ask for a call back" })).toBeOnTheScreen();
    expect(screen.getByText(/Leave your number in the form/)).toBeOnTheScreen();
  });

  it("offers a call, else WhatsApp, once the numbers are filled in", async () => {
    await render(<ContactHeroActions details={{ ...details, phone: "+919876543210", phoneDisplay: "+91 98765 43210", whatsapp: "919876543210" }} />);
    await fireEvent.press(screen.getByRole("link", { name: "Call +91 98765 43210" }));
    expect(openURL).toHaveBeenLastCalledWith("tel:+919876543210");
    await render(<ContactHeroActions details={{ ...details, whatsapp: "919876543210" }} />);
    await fireEvent.press(screen.getByRole("link", { name: "Chat on WhatsApp" }));
    expect(openURL).toHaveBeenLastCalledWith(whatsappUrl("919876543210", WHATSAPP_GREETING));
    await render(<ContactHeroActions details={{ ...details, phone: "+911234" }} />);
    expect(screen.getByRole("link", { name: "Call +911234" })).toBeOnTheScreen();
  });

  it("shows only the details the website has: today WhatsApp, the service area and hours", async () => {
    expect(contactRows(details).map((r) => r.label)).toEqual(["Service area", "Hours"]);
    expect(contactRows().map((r) => r.label)).toEqual(["WhatsApp", "Service area", "Hours"]);
    expect(contactRows()[0]).toMatchObject({ value: site.whatsappDisplay, href: whatsappUrl(site.whatsapp, WHATSAPP_GREETING) });
    expect(contactRows({ ...details, whatsapp: "911", whatsappDisplay: "" })[0].value).toBe("Chat on WhatsApp");
    const full = contactRows({ ...details, phone: "+911", whatsapp: "911", email: "a@b.in", address: { street: "1 MG Road", postalCode: "282001" } });
    expect(full.map((r) => r.label)).toEqual(["Phone", "WhatsApp", "Email", "Address", "Service area", "Hours"]);
    expect(full[0].value).toBe("+911");
    expect(full[3].value).toBe(`1 MG Road, ${site.city}, ${site.region} 282001`);
  });

  it("links the rows that lead somewhere", async () => {
    await render(<ContactRows rows={contactRows({ ...details, email: "a@b.in" })} />);
    expect(screen.getByText(site.hoursDisplay)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: `${site.city}, ${site.region}` }));
    expect(pushed()).toEqual(["/services/house-painting/agra#localities"]);
    await fireEvent.press(screen.getByRole("link", { name: "a@b.in" }));
    expect(openURL).toHaveBeenCalledWith("mailto:a@b.in");
  });

  it("holds the contact form, the steps and what we cover", async () => {
    await render(
      <>
        <SendMessage />
        <AfterContact />
        <Coverage />
      </>,
    );
    expect(screen.getByRole("header", { name: "Send us a message" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Send message" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "From first call to an itemised quote" })).toBeOnTheScreen();
    expect(screen.getByText(new RegExp(`During working hours \\(${site.hoursDisplay}\\)`))).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Book a free site visit" }));
    await fireEvent.press(screen.getByRole("link", { name: `Areas we serve in ${live[0].name}` }));
    await fireEvent.press(screen.getByRole("link", { name: services[1].name }));
    expect(pushed()).toEqual(["/book", `${cityPath(live[0])}#localities`, `/services/${services[1].slug}`]);
  });
});

const fetchMock = jest.fn();
const envelope = (data: unknown) => ({ ok: true, status: 200, json: async () => ({ apiVersion: "v1", kind: "paint-colour", label: "x", data, meta: { generatedAt: "2026-10-31T00:00:00.000Z" } }) }) as Response;

describe("book", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
  });


  it("starts the form with the palette's shades in the note, shown with the service under “Added to your booking”", async () => {
    const palette = palettes[0];
    await render(<BookForm query={{ palette: palette.slug, service: "interior-painting" }} />);
    expect(screen.getByText("Added to your booking")).toBeOnTheScreen();
    expect(screen.getByText("Interior Painting")).toBeOnTheScreen();
    expect(screen.getByText(new RegExp(`"${palette.name}" palette`))).toBeOnTheScreen();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("looks a brand shade up and fills it in when it arrives", async () => {
    fetchMock.mockResolvedValue(envelope([{ id: "asian-paints:8386", brand: "asian-paints", brandName: "Asian Paints", code: "8386", name: "Pepper Leaf", hex: "#bbc8b2" }]));
    const note = "Interested in Asian Paints 8386 Pepper Leaf (#BBC8B2). Please bring the shade card.";
    await render(<BookForm query={{ shade: "asian-paints:8386" }} />);
    await waitFor(() => expect(screen.getByText(note)).toBeOnTheScreen());
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/colours/paint?q=8386&brand=asian-paints&perPage=5");
  });

  it("holds the shade's place in a skeleton while it is looked up", async () => {
    let answer: (r: Response) => void = () => undefined;
    fetchMock.mockReturnValue(new Promise<Response>((r) => (answer = r)));
    await render(<BookForm query={{ shade: "asian-paints:8386" }} />);
    expect(screen.getByText("Added to your booking")).toBeOnTheScreen();
    expect(screen.getByLabelText("Adding the shade you picked")).toBeBusy();
    await act(async () => answer(envelope([{ id: "asian-paints:8386", brand: "asian-paints", brandName: "Asian Paints", code: "8386", name: "Pepper Leaf", hex: "#bbc8b2" }])));
    await waitFor(() => expect(screen.getByText(/Interested in Asian Paints 8386 Pepper Leaf/)).toBeOnTheScreen());
    expect(screen.queryByLabelText("Adding the shade you picked")).toBeNull();
  });

  it("drops the skeleton when the shade cannot be found or fetched", async () => {
    let fail: (e: Error) => void = () => undefined;
    fetchMock.mockReturnValue(new Promise<Response>((_r, reject) => (fail = reject)));
    await render(<BookForm query={{ shade: "asian-paints:8386" }} />);
    expect(screen.getByLabelText("Adding the shade you picked")).toBeOnTheScreen();
    await act(async () => fail(new Error("offline")));
    await waitFor(() => expect(screen.queryByText("Added to your booking")).toBeNull());
    expect(screen.getByRole("button", { name: "Book my site visit" })).toBeOnTheScreen();
  });

  it("looks nothing up for an id that cannot be a shade", async () => {
    await render(<BookForm query={{ shade: "not a shade" }} />);
    expect(screen.queryByText("Added to your booking")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is the plain short form without a query", async () => {
    await render(<BookForm query={{}} />);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByText("Added to your booking")).toBeNull();
    expect(screen.getByLabelText("Area / locality")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Book my site visit" })).toBeOnTheScreen();
  });

  it("says what happens next and how to talk to us", async () => {
    await render(
      <>
        <NextSteps />
        <PreferToTalk details={details} />
      </>,
    );
    expect(screen.getByRole("header", { name: "What happens next" })).toBeOnTheScreen();
    expect(screen.getByText(/Nothing is booked until you approve it/)).toBeOnTheScreen();
    expect(screen.getByText(`Leave your number in the form and we'll call you back, ${site.hoursDisplay}.`)).toBeOnTheScreen();
  });

  it("gives the number to call once the website has one", async () => {
    await render(<PreferToTalk details={{ ...details, phone: "+919876543210" }} />);
    await fireEvent.press(screen.getByRole("link", { name: "+919876543210" }));
    expect(openURL).toHaveBeenCalledWith("tel:+919876543210");
    await render(<PreferToTalk details={{ ...details, phone: "+919876543210", phoneDisplay: "+91 98765 43210" }} />);
    expect(screen.getByRole("link", { name: "+91 98765 43210" })).toBeOnTheScreen();
  });

  it("shows how booking works and the booking questions", async () => {
    await render(
      <>
        <BookingSteps />
        <BookingFaq />
      </>,
    );
    expect(screen.getByRole("header", { name: "How booking painters online works" })).toBeOnTheScreen();
    bookingSteps.forEach((s, i) => {
      expect(screen.getByText(`0${i + 1}`)).toBeOnTheScreen();
      expect(screen.getByRole("header", { name: s.title })).toBeOnTheScreen();
    });
    expect(screen.getByText(bookingFaqs[0].q)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "painting FAQ" }));
    await fireEvent.press(screen.getByRole("link", { name: live.at(-1)!.name }));
    expect(pushed()).toEqual(["/faq", cityPath(live.at(-1)!)]);
  });
});

describe("thank you", () => {
  it("reads the type and whether the form was sent", () => {
    expect(["booking", "visit", "waitlist", "contact"].map((t) => thankYouType(t))).toEqual(["booking", "visit", "waitlist", "contact"]);
    expect(thankYouType(undefined)).toBe("booking");
    expect(thankYouType("other")).toBe("booking");
    expect(thankYouType(["contact", "booking"])).toBe("contact");
    expect(wasSent("1")).toBe(true);
    expect(wasSent(["1"])).toBe(true);
    for (const v of ["0", undefined, "yes"]) expect(wasSent(v)).toBe(false);
  });

  it("thanks a sent booking in the website's words, with what happens next", async () => {
    await render(<ThankYou type="booking" sent />);
    expect(screen.queryByRole("link", { name: "Add your address" })).toBeNull();
    expect(screen.getByLabelText(illustrations.toolbox.alt)).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Your inspection request is in" })).toBeOnTheScreen();
    expect(screen.getByText(`Shukriya! Our team will call you shortly to confirm a time for the site visit. Hours: ${site.hoursDisplay}.`)).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Aage kya hoga · What happens next" })).toBeOnTheScreen();
    for (const s of bookingSteps.slice(1)) expect(screen.getByText(s.title)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Back to home" }));
    await fireEvent.press(screen.getByRole("link", { name: "Explore services" }));
    expect(router.navigate).toHaveBeenCalledWith("/");
    expect(router.push).toHaveBeenCalledWith("/services");
  });

  it("links a booking sent from the app to its tracker", async () => {
    await render(<ThankYou type="booking" sent project="3f0c-1" />);
    expect(screen.getByRole("header", { name: "Your inspection request is in" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Add your address" }));
    expect(router.push).toHaveBeenCalledWith("/account/projects/3f0c-1");
    expect(projectParam("3f0c-1")).toBe("3f0c-1");
    expect(projectParam(["p-2", "p-3"])).toBe("p-2");
    for (const bad of [undefined, "", "../admin", "a b", "x".repeat(65)]) expect(projectParam(bad)).toBeUndefined();
  });

  it("words a sent message and the waitlist as the website does, without the steps", async () => {
    await render(<ThankYou type="contact" sent />);
    expect(screen.getByRole("header", { name: "Thanks for your message" })).toBeOnTheScreen();
    expect(screen.queryByText("Aage kya hoga · What happens next")).toBeNull();
    expect(sentCopy("waitlist")).toEqual({ title: "You're on the waitlist", text: "We'll call you as soon as we start painting in your city." });
    expect(sentCopy("visit").title).toBe("Your inspection request is in");
    await render(<ThankYou type="waitlist" sent />);
    expect(screen.getByRole("header", { name: "You're on the waitlist" })).toBeOnTheScreen();
  });

  it("says plainly when nothing was sent, promises no call, and points to the website and WhatsApp", async () => {
    await render(<ThankYou type="booking" sent={false} />);
    expect(screen.getByRole("header", { name: "Your request was not sent" })).toBeOnTheScreen();
    expect(screen.getByText(/Nothing was sent, so no one will call you about this request/)).toBeOnTheScreen();
    expect(screen.queryByText(/will call you shortly/)).toBeNull();
    expect(screen.queryByText("Aage kya hoga · What happens next")).toBeNull();
    await fireEvent.press(screen.getByRole("link", { name: "Book on the website" }));
    await fireEvent.press(screen.getByRole("link", { name: "Contact us on the website" }));
    expect(openURL.mock.calls.map(([u]) => u)).toEqual([webUrl("/book"), webUrl("/contact")]);
    await fireEvent.press(screen.getByRole("link", { name: "Back to home" }));
    expect(router.navigate).toHaveBeenCalledWith("/");
    // the website lists a WhatsApp number, so the screen offers it with the hours it is answered
    await fireEvent.press(screen.getByRole("link", { name: "WhatsApp us" }));
    expect(openURL.mock.calls.at(-1)?.[0]).toBe(whatsappUrl(site.whatsapp, WHATSAPP_GREETING));
    expect(screen.getByText(`We answer ${site.hoursDisplay}.`)).toBeOnTheScreen();
  });

  it("puts the contact page first for an unsent message or waitlist note", () => {
    expect(webActions("contact").map((a) => a.url)).toEqual([webUrl("/contact"), webUrl("/book")]);
    expect(webActions("waitlist")[0].url).toBe(webUrl("/contact"));
    expect(webActions("visit")[0].url).toBe(webUrl("/book"));
    for (const t of ["booking", "visit", "waitlist", "contact"] as const) {
      expect(notSentCopy(t).text).toMatch(/Nothing was sent/);
      expect(notSentCopy(t).text).not.toMatch(/will call you shortly|get back to you/);
    }
    expect(notSentCopy("contact").title).toBe("Your message was not sent");
    expect(notSentCopy("waitlist").title).toBe("You're not on the waitlist yet");
  });

  it("offers call and WhatsApp once the website has numbers", async () => {
    (contactLinks as jest.Mock).mockReturnValue([{ kind: "call", label: "Call us", url: "tel:+911" }]);
    await render(<ThankYou type="contact" sent={false} />);
    await fireEvent.press(screen.getByRole("link", { name: "Call us" }));
    expect(openURL).toHaveBeenCalledWith("tel:+911");
    expect(screen.getByText(`We answer ${site.hoursDisplay}.`)).toBeOnTheScreen();
  });
});

describe("legal pages", () => {
  it("lay out the title, headings, paragraphs and lists", async () => {
    await render(
      <ProsePage title="Privacy policy" path="/privacy-policy">
        <ProseP>Intro</ProseP>
        <ProseH2>Information we collect</ProseH2>
        <ProseList items={["One", "Two"]} />
      </ProsePage>,
    );
    expect(screen.getByRole("header", { name: "Privacy policy" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Information we collect" })).toBeOnTheScreen();
    expect(screen.getByText("Two")).toBeOnTheScreen();
    expect(within(screen.getByLabelText("Breadcrumb")).getByText("Privacy policy")).toBeOnTheScreen();
  });
});

describe("not found and errors", () => {
  it("offers four pages, home and booking", async () => {
    await render(<NotFoundContent />);
    expect(screen.getByRole("header", { name: "Page not found." })).toBeOnTheScreen();
    for (const name of ["Painting services", "Colour finder", "Questions and answers", "Contact us", "Book a free site visit"]) await fireEvent.press(screen.getByRole("link", { name }));
    expect(pushed()).toEqual(["/services", "/colours", "/faq", "/contact", "/book"]);
    await fireEvent.press(screen.getByRole("link", { name: "Back to home" }));
    expect(router.navigate).toHaveBeenCalledWith("/");
  });

  it("lets a broken page try again, inside the site's header and footer", async () => {
    const retry = jest.fn(async () => undefined);
    await render(
      <NavStateProvider>
        <ScreenError error={new Error("boom")} retry={retry} />
      </NavStateProvider>,
    );
    expect(screen.getByRole("header", { name: "Something went wrong." })).toBeOnTheScreen();
    expect(screen.queryByText("boom")).toBeNull();
    expect(screen.getByTestId("footer")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalled();
  });

  it("leads home or to booking from the error notice", async () => {
    await render(<ErrorNotice retry={jest.fn()} />);
    await fireEvent.press(screen.getByRole("link", { name: "Go to the home page" }));
    await fireEvent.press(screen.getByRole("link", { name: "Book a free site visit" }));
    expect(router.navigate).toHaveBeenCalledWith("/");
    expect(pushed()).toEqual(["/book"]);
  });
});
