import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { AccessibilityInfo } from "react-native";
import { getAnimatedStyle } from "react-native-reanimated";

import { LeadForm, localityChoices } from "~/components/site/LeadForm";
import { FORM_ERROR } from "~/lib/leads";
import { FIELD_MESSAGES, liveCities, type City } from "~/shared";

jest.mock("expo-router", () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));

// every host input's focus() (the preset's shared mock); its `this` says which field took focus
const focus: jest.Mock = jest.requireActual("@react-native/jest-preset/jest/MockNativeMethods").default.focus;
const focused = () => (focus.mock.contexts.at(-1) as { props: { accessibilityLabel?: string } } | undefined)?.props.accessibilityLabel;

const live = liveCities();
const [agra, mathura] = live;
const press = (name: string | RegExp) => fireEvent.press(screen.getByRole("button", { name }));
const type = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);
const pick = async (select: string, option: string) => {
  await fireEvent.press(screen.getByLabelText(select));
  await fireEvent.press(screen.getByRole("button", { name: option }));
};
const step = () => screen.getByRole("progressbar");

async function fillDetails(city: City = agra) {
  await type("Your name", "Asha Verma");
  await type("Mobile number", "98765 43210");
  await fireEvent.press(screen.getByRole("radio", { name: city.name }));
}

async function toWhereToPaint(city: City = agra) {
  await fillDetails(city);
  await press("Continue");
}

async function fillAddress(city: City = agra) {
  await type("House / flat no., building and street", "12, Rose Villa, Nehru Road");
  await type(`Locality in ${city.name}`, city.areas[0]);
  await type("PIN code", "282005");
}

beforeEach(() => jest.clearAllMocks());

describe("localityChoices", () => {
  const areas = ["Kamla Nagar", "Krishna Nagar", "Dayalbagh"];
  it("offers every locality before typing and once one is chosen, else those containing what is typed", () => {
    expect(localityChoices(areas, "")).toEqual(areas);
    expect(localityChoices(areas, " dayalbagh ")).toEqual(areas);
    expect(localityChoices(areas, "nag")).toEqual(["Kamla Nagar", "Krishna Nagar"]);
    expect(localityChoices(areas, "Sector 9")).toEqual([]);
  });
});

describe("LeadForm (booking): step 1, your details", () => {
  it("starts with the city chosen on a city's own page, and ignores a city that is not live", async () => {
    const { rerender } = await render(<LeadForm type="booking" defaultCity="mathura" />);
    expect(screen.getByRole("radio", { name: "Mathura" })).toBeChecked();
    await rerender(<LeadForm key="soon" type="booking" defaultCity="bangalore" />);
    for (const name of ["Agra", "Mathura", "Vrindavan"]) expect(screen.getByRole("radio", { name })).not.toBeChecked();
  });

  it("starts with name, mobile and the live cities as pills under a progress bar", async () => {
    await render(<LeadForm type="booking" />);
    expect(step()).toHaveAccessibilityValue({ min: 1, max: 2, now: 1, text: "Step 1 of 2" });
    expect(step()).toHaveProp("accessibilityLabel", "Your details");
    expect(screen.getByLabelText("Your name")).toBeOnTheScreen();
    expect(screen.getByLabelText("Mobile number")).toBeOnTheScreen();
    for (const c of live) expect(screen.getByRole("radio", { name: c.name })).not.toBeChecked();
    expect(screen.queryByLabelText("House / flat no., building and street")).toBeNull();
    expect(screen.queryByRole("button", { name: "Book my inspection" })).toBeNull();
    expect(screen.queryByText("Added to your booking")).toBeNull();
  });

  it("checks only this step on Continue, with the website's messages, and focuses the first problem", async () => {
    await render(<LeadForm type="booking" />);
    await press("Continue");
    for (const f of ["name", "phone", "city"] as const) expect(screen.getByText(FIELD_MESSAGES[f])).toBeOnTheScreen();
    for (const f of ["address", "locality", "pincode"] as const) expect(screen.queryByText(FIELD_MESSAGES[f])).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent(FORM_ERROR);
    expect(focused()).toBe("Your name");
    expect(step()).toHaveAccessibilityValue({ now: 1 });
    expect(router.push).not.toHaveBeenCalled();
  });

  it("moves the screen reader to the city pills when the city is the only thing missing", async () => {
    await render(<LeadForm type="booking" />);
    await type("Your name", "Asha Verma");
    await type("Mobile number", "9876543210");
    await press("Continue");
    expect(screen.queryByText(FIELD_MESSAGES.name)).toBeNull();
    expect(screen.getByText(FIELD_MESSAGES.city)).toBeOnTheScreen();
    expect(AccessibilityInfo.sendAccessibilityEvent).toHaveBeenCalledWith(expect.anything(), "focus");
    await fireEvent.press(screen.getByRole("radio", { name: mathura.name }));
    expect(screen.getByRole("radio", { name: mathura.name })).toBeChecked();
    expect(screen.queryByText(FIELD_MESSAGES.city)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("checks a field the visitor leaves and clears the error once fixed", async () => {
    await render(<LeadForm type="booking" />);
    const phone = screen.getByLabelText("Mobile number");
    await fireEvent(phone, "blur");
    expect(screen.queryByText(FIELD_MESSAGES.phone)).toBeNull();
    await fireEvent.changeText(phone, "12345");
    await fireEvent(phone, "blur");
    expect(screen.getByText(FIELD_MESSAGES.phone)).toBeOnTheScreen();
    await fireEvent(phone, "blur");
    await fireEvent.changeText(phone, "1234567");
    expect(screen.getByText(FIELD_MESSAGES.phone)).toBeOnTheScreen();
    await fireEvent.changeText(phone, "9876543210");
    expect(screen.queryByText(FIELD_MESSAGES.phone)).toBeNull();
  });

  it("goes from the name to the mobile number with the keyboard's next key", async () => {
    await render(<LeadForm type="booking" />);
    await fireEvent(screen.getByLabelText("Your name"), "submitEditing");
    expect(focused()).toBe("Mobile number");
  });

  it("asks no city when only one is live", async () => {
    await render(<LeadForm type="booking" live={[agra]} />);
    expect(screen.queryByRole("radio")).toBeNull();
    await type("Your name", "Asha Verma");
    await type("Mobile number", "9876543210");
    await press("Continue");
    expect(screen.getByLabelText(`Locality in ${agra.name}`)).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: agra.areas[0] })).toBeOnTheScreen();
  });
});

describe("LeadForm (booking): something still on its way", () => {
  it("holds its place under “Added to your booking” in a skeleton, with the service already there", async () => {
    await render(<LeadForm type="booking" defaultService="Interior Painting" carrying />);
    expect(screen.getByText("Added to your booking")).toBeOnTheScreen();
    expect(screen.getByText("Interior Painting")).toBeOnTheScreen();
    expect(screen.getByLabelText("Adding the shade you picked")).toBeBusy();
  });

  it("shows the note instead once it is there", async () => {
    await render(<LeadForm type="booking" defaultMessage="Interested in Pepper Leaf." carrying />);
    expect(screen.getByText("Interested in Pepper Leaf.")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Adding the shade you picked")).toBeNull();
  });
});

describe("LeadForm (booking): step 2, where to paint", () => {
  it("opens on the address once the details are fine, and Back keeps every answer", async () => {
    await render(<LeadForm type="booking" />);
    await toWhereToPaint();
    expect(step()).toHaveAccessibilityValue({ min: 1, max: 2, now: 2, text: "Step 2 of 2" });
    expect(step()).toHaveProp("accessibilityLabel", "Where to paint");
    expect(focused()).toBe("House / flat no., building and street");
    expect(screen.queryByLabelText("Your name")).toBeNull();
    await type("House / flat no., building and street", "12, Rose Villa");
    await press("Back");
    expect(step()).toHaveAccessibilityValue({ now: 1 });
    expect(screen.getByLabelText("Your name")).toHaveProp("value", "Asha Verma");
    expect(screen.getByLabelText("Mobile number")).toHaveProp("value", "98765 43210");
    expect(screen.getByRole("radio", { name: agra.name })).toBeChecked();
    await press("Continue");
    expect(screen.getByLabelText("House / flat no., building and street")).toHaveProp("value", "12, Rose Villa");
  });

  it("fills the progress bar's second half as the step changes, and empties it on Back", async () => {
    await render(<LeadForm type="booking" />);
    // the animated view's style as it is now (Reanimated's Jest helper; its web typing takes no argument)
    const fill = () => (getAnimatedStyle as unknown as (el: unknown) => object)(screen.getByTestId("progress-fill", { includeHiddenElements: true }));
    expect(fill()).toMatchObject({ transform: [{ scaleX: 0 }], transformOrigin: "left" });
    await toWhereToPaint();
    await waitFor(() => expect(fill()).toMatchObject({ transform: [{ scaleX: 1 }] }));
    await press("Back");
    await waitFor(() => expect(fill()).toMatchObject({ transform: [{ scaleX: 0 }] }));
  });

  it("shows the website's message for every field of this step left empty, focusing the first", async () => {
    await render(<LeadForm type="booking" />);
    await toWhereToPaint();
    await press("Book my inspection");
    for (const f of ["address", "locality", "pincode"] as const) expect(screen.getByText(FIELD_MESSAGES[f])).toBeOnTheScreen();
    expect(screen.getByRole("alert")).toHaveTextContent(FORM_ERROR);
    expect(focused()).toBe("House / flat no., building and street");
    expect(router.push).not.toHaveBeenCalled();
    // back on step 1 the form line goes (nothing there needs fixing); the step's problems wait for the return
    await press("Back");
    expect(screen.queryByRole("alert")).toBeNull();
    await press("Continue");
    expect(screen.getByText(FIELD_MESSAGES.pincode)).toBeOnTheScreen();
  });

  it("opens the thank-you page after a complete booking, marked as not sent", async () => {
    await render(<LeadForm type="booking" />);
    await toWhereToPaint();
    await fillAddress();
    await press("Book my inspection");
    expect(router.push).toHaveBeenCalledWith({ pathname: "/thank-you", params: { type: "booking", sent: "0" } });
  });

  it("hands the result to onDone instead when given, with the note under both steps' buttons", async () => {
    const onDone = jest.fn();
    await render(<LeadForm type="booking" onDone={onDone} footnote="Zero advance payment." />);
    expect(screen.getByText("Zero advance payment.")).toBeOnTheScreen();
    await toWhereToPaint();
    expect(screen.getByText("Zero advance payment.")).toBeOnTheScreen();
    await fillAddress();
    await press("Book my inspection");
    expect(onDone).toHaveBeenCalledWith({ sent: false });
    expect(router.push).not.toHaveBeenCalled();
  });

  it("drops the form line when the last error is fixed", async () => {
    await render(<LeadForm type="booking" />);
    await toWhereToPaint();
    await fillAddress();
    await type("PIN code", "28");
    await press("Book my inspection");
    expect(screen.getByRole("alert")).toBeOnTheScreen();
    expect(focused()).toBe("PIN code");
    await type("PIN code", "282005");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("offers the chosen city's localities as pills, narrowing as the visitor types, and keeps free text", async () => {
    await render(<LeadForm type="booking" />);
    await toWhereToPaint(mathura);
    const locality = screen.getByLabelText(`Locality in ${mathura.name}`);
    expect(screen.getByLabelText(`Localities in ${mathura.name}`)).toBeOnTheScreen();
    expect(screen.queryByRole("radio", { name: agra.areas[0] })).toBeNull();
    await fireEvent.press(screen.getByRole("radio", { name: mathura.areas[1] }));
    expect(locality).toHaveProp("value", mathura.areas[1]);
    expect(screen.getByRole("radio", { name: mathura.areas[1] })).toBeChecked();
    expect(screen.getAllByRole("radio")).toHaveLength(mathura.areas.length);
    await fireEvent.changeText(locality, "nagar");
    expect(screen.getAllByRole("radio").map((r) => r.props.accessibilityLabel)).toEqual(mathura.areas.filter((a) => a.toLowerCase().includes("nagar")));
    await fireEvent.changeText(locality, "Sector 9");
    expect(screen.queryByLabelText(`Localities in ${mathura.name}`)).toBeNull();
    expect(locality).toHaveProp("value", "Sector 9");
  });

  it("goes through the address fields with the keyboard's next key", async () => {
    await render(<LeadForm type="booking" />);
    await toWhereToPaint();
    await fireEvent(screen.getByLabelText("House / flat no., building and street"), "submitEditing");
    expect(focused()).toBe(`Locality in ${agra.name}`);
    await fireEvent(screen.getByLabelText(`Locality in ${agra.name}`), "submitEditing");
    expect(focused()).toBe("PIN code");
  });

  it("keeps the job details optional, with selects, a live estimate and a date", async () => {
    await render(<LeadForm type="booking" />);
    await toWhereToPaint();
    expect(screen.queryByLabelText("What needs painting?")).toBeNull();
    await press(/Add more details/);
    await pick("What needs painting?", "Interior Painting");
    await pick("Property type", "Villa / Kothi");
    await pick("Floors to paint", "2 floors");
    await pick("Home size", "2 BHK");
    expect(screen.getByText(/It's on your sale deed/)).toBeOnTheScreen();
    await type("Carpet area per floor (sq ft)", "1000");
    expect(screen.getByText(/of walls and ceilings to paint/)).toBeOnTheScreen();
    await pick("What needs painting?", "Doors, Windows & Small Jobs");
    expect(screen.getByText("Measured on site for this job.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText("Preferred inspection date"));
    await fireEvent(screen.getByTestId("date-picker"), "valueChange", { type: "set" }, new Date(2026, 11, 25));
    await press("Done");
    expect(screen.getByText("Fri 25 Dec 2026")).toBeOnTheScreen();
    await type("Anything we should know?", "Two doors");
    // the note is optional on a booking: leaving it short is fine
    await type("Anything we should know?", "Tw");
    await fireEvent(screen.getByLabelText("Anything we should know?"), "blur");
    expect(screen.queryByText(FIELD_MESSAGES.message)).toBeNull();
    await type("Anything we should know?", "Two doors");
    expect(screen.getByLabelText("Anything we should know?")).toHaveProp("value", "Two doors");
    await press(/Add more details/);
    expect(screen.queryByLabelText("What needs painting?")).toBeNull();
  });

  it("refuses a carpet area out of range, opening the details to show it and focusing it", async () => {
    await render(<LeadForm type="booking" defaultService="Interior Painting" />);
    await toWhereToPaint();
    await fillAddress();
    await press(/Add more details/);
    await type("Carpet area per floor (sq ft)", "50");
    await fireEvent(screen.getByLabelText("Carpet area per floor (sq ft)"), "blur");
    expect(screen.getByText(/Enter the carpet area in sq ft/)).toBeOnTheScreen();
    await press(/Add more details/);
    await press("Book my inspection");
    expect(screen.getByLabelText("What needs painting?")).toHaveAccessibilityValue({ text: "Interior Painting" });
    expect(focused()).toBe("Carpet area per floor (sq ft)");
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("LeadForm (booking): what the page prefilled", () => {
  it("shows the service and note on the first step and fills them in on the second, details open", async () => {
    await render(<LeadForm type="booking" defaultService="Interior Painting" defaultMessage="Interested in Asian Paints 8386 Pepper Leaf" />);
    expect(screen.getByText("Added to your booking")).toBeOnTheScreen();
    expect(screen.getByText("Interior Painting")).toBeOnTheScreen();
    expect(screen.getByText("Interested in Asian Paints 8386 Pepper Leaf")).toBeOnTheScreen();
    await toWhereToPaint();
    expect(screen.getByLabelText("Anything we should know?")).toHaveProp("value", "Interested in Asian Paints 8386 Pepper Leaf");
    expect(screen.getByLabelText("What needs painting?")).toHaveAccessibilityValue({ text: "Interior Painting" });
  });

  it("shows a prefilled service alone, its details closed", async () => {
    await render(<LeadForm type="booking" defaultService="Exterior Painting" />);
    expect(screen.getByText("Exterior Painting")).toBeOnTheScreen();
    await toWhereToPaint();
    expect(screen.queryByLabelText("What needs painting?")).toBeNull();
  });

  it("shows a prefilled note alone", async () => {
    await render(<LeadForm type="booking" defaultMessage="Two doors" />);
    expect(screen.getByText("Added to your booking")).toBeOnTheScreen();
    expect(screen.getByText("Two doors")).toBeOnTheScreen();
  });

  it("links to the privacy policy screen", async () => {
    await render(<LeadForm type="booking" />);
    await fireEvent.press(screen.getByRole("link", { name: "privacy policy" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/privacy-policy", params: {} });
  });
});

describe("LeadForm (contact)", () => {
  it("is one short form: name, mobile and a message, then the thank-you page", async () => {
    await render(<LeadForm type="contact" defaultMessage="Waitlist for Delhi NCR" />);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByLabelText("House / flat no., building and street")).toBeNull();
    await type("How can we help?", "");
    await press("Send message");
    expect(screen.getByText(FIELD_MESSAGES.message)).toBeOnTheScreen();
    expect(focused()).toBe("Your name");
    await type("Your name", "Asha");
    await type("Mobile number", "9876543210");
    await type("How can we help?", "Waitlist for Delhi NCR");
    await press("Send message");
    expect(router.push).toHaveBeenCalledWith({ pathname: "/thank-you", params: { type: "contact", sent: "0" } });
  });
});
