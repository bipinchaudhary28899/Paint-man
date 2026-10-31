import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as Location from "expo-location";
import { router } from "expo-router";
import { AccessibilityInfo, Linking } from "react-native";
import { getAnimatedStyle } from "react-native-reanimated";

import { LeadForm, localityChoices, SIGN_IN_NOTE } from "~/components/site/LeadForm";
import { AuthProvider, useAuth, type Auth } from "~/lib/auth-context";
import { emptyBooking, toBookingPayload } from "~/lib/booking";
import { heldBooking, holdBooking, releaseBooking } from "~/lib/pending-booking";
import { FORM_ERROR } from "~/lib/leads";
import { CITY_DELTA, INDIA, NOT_LISTED_NOTE, regionAt, type Place } from "~/lib/location";
import { FIELD_MESSAGES, liveCities, site, type City } from "~/shared";
import { asha, mockApi, seedToken, type Answer, type Call } from "../account/helpers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
  usePathname: jest.fn(() => "/book"),
}));

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

beforeEach(() => {
  jest.clearAllMocks();
  releaseBooking();
});

const toLogin = { pathname: "/login", params: { next: "/book", resume: "booking" } };
const booked: Answer = { status: 201, data: { received: true, projectId: "p-1" } };

/** The form inside a signed-in session (the saved token checked with /api/v1/me), the booking endpoint answering `bookings`. */
async function renderSignedIn(ui: React.ReactElement, bookings: Answer | Answer[] = booked, user = asha) {
  seedToken();
  const calls = mockApi({ "GET /api/v1/me": { data: user }, "POST /api/v1/bookings": bookings });
  await render(<AuthProvider>{ui}</AuthProvider>);
  await waitFor(() => expect(calls.some((c) => c.path === "/api/v1/me")).toBe(true));
  return calls;
}

const bookingCalls = (calls: Call[]) => calls.filter((c) => c.path === "/api/v1/bookings");

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

  it("signed out, holds a complete booking and opens the login screen, saying a code comes first", async () => {
    await render(<LeadForm type="booking" />);
    await toWhereToPaint();
    expect(screen.getByText(SIGN_IN_NOTE)).toBeOnTheScreen();
    await fillAddress();
    await press("Book my inspection");
    expect(router.push).toHaveBeenCalledWith(toLogin);
    expect(heldBooking()).toMatchObject({ path: "/book", values: { name: "Asha Verma", phone: "98765 43210", pincode: "282005" } });
  });

  it("hands the result to onDone instead when given, with the note under both steps' buttons", async () => {
    const onDone = jest.fn();
    await renderSignedIn(<LeadForm type="booking" onDone={onDone} footnote="Zero advance payment." />);
    expect(screen.getByText("Zero advance payment.")).toBeOnTheScreen();
    await toWhereToPaint();
    expect(screen.getByText("Zero advance payment.")).toBeOnTheScreen();
    expect(screen.queryByText(SIGN_IN_NOTE)).toBeNull();
    await fillAddress();
    await press("Book my inspection");
    await waitFor(() => expect(onDone).toHaveBeenCalledWith({ sent: true, projectId: "p-1" }));
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

describe("LeadForm (booking): the address from the map", () => {
  const loc = jest.mocked(Location);
  const granted = { status: "granted", granted: true, canAskAgain: true, expires: "never" } as Awaited<ReturnType<typeof Location.requestForegroundPermissionsAsync>>;
  const home = { lat: 27.2046, lng: 78.0042 };
  const kamlaNagar: Place = { name: "12 Nehru Road", streetNumber: "12", street: "Nehru Road", district: "Kamla Nagar", city: "Agra", subregion: "Agra", postalCode: "282005" };
  const lucknow: Place = { name: "MG Road", district: "Hazratganj", city: "Lucknow", subregion: "Lucknow", postalCode: "226001" };
  const map = () => screen.getByLabelText("Map. Move it to put the pin on your home");
  const placeIs = (place: Place | null) => loc.reverseGeocodeAsync.mockResolvedValue(place ? [place as Location.LocationGeocodedAddress] : []);
  const shareLocation = () => press("Use my current location");
  const confirm = () => press("Confirm this location");

  beforeEach(() => {
    loc.requestForegroundPermissionsAsync.mockResolvedValue(granted);
    loc.hasServicesEnabledAsync.mockResolvedValue(true);
    loc.getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: home.lat, longitude: home.lng, altitude: null, accuracy: 5, altitudeAccuracy: null, heading: null, speed: null }, timestamp: 0 });
    loc.getLastKnownPositionAsync.mockResolvedValue(null);
    loc.geocodeAsync.mockResolvedValue([]);
    placeIs(kamlaNagar);
  });

  it("asks for location only when the visitor taps for it", async () => {
    await render(<LeadForm type="booking" />);
    await toWhereToPaint();
    expect(screen.getByRole("button", { name: "Use my current location" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Pick on the map" })).toBeOnTheScreen();
    expect(screen.queryByLabelText("Map. Move it to put the pin on your home")).toBeNull();
    expect(loc.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    await shareLocation();
    expect(loc.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(map()).toHaveProp("initialRegion", regionAt(home));
  });

  it("fills the address, locality, PIN and city from the confirmed pin, all still editable", async () => {
    await render(<LeadForm type="booking" />);
    await toWhereToPaint(mathura);
    await type("House / flat no., building and street", "typed before");
    await shareLocation();
    await confirm();
    expect(screen.queryByLabelText("Map. Move it to put the pin on your home")).toBeNull();
    expect(screen.getByLabelText("House / flat no., building and street")).toHaveProp("value", "12 Nehru Road");
    expect(screen.getByLabelText(`Locality in ${agra.name}`)).toHaveProp("value", "Kamla Nagar");
    expect(screen.getByRole("radio", { name: "Kamla Nagar" })).toBeChecked();
    expect(screen.getByLabelText("PIN code")).toHaveProp("value", "282005");
    expect(screen.getByText("Pinned on the map")).toBeOnTheScreen();
    expect(screen.getByText("12 Nehru Road, Kamla Nagar, Agra")).toBeOnTheScreen();
    expect(screen.queryByText(NOT_LISTED_NOTE)).toBeNull();
    expect(screen.queryByRole("button", { name: "Use my current location" })).toBeNull();
    await type("House / flat no., building and street", "Flat 4, 12 Nehru Road");
    expect(screen.getByLabelText("House / flat no., building and street")).toHaveProp("value", "Flat 4, 12 Nehru Road");
    await press("Back");
    expect(screen.getByRole("radio", { name: agra.name })).toBeChecked();
    await press("Continue");
    await press("Book my inspection");
    // signed out: the pinned spot is held with the answers for after the sign-in
    expect(router.push).toHaveBeenCalledWith(toLogin);
    expect(heldBooking()?.pin).toMatchObject({ coords: home, short: "12 Nehru Road, Kamla Nagar, Agra", outside: false });
  });

  it("clears the errors the pin fixes", async () => {
    await render(<LeadForm type="booking" />);
    await toWhereToPaint();
    await press("Book my inspection");
    expect(screen.getByRole("alert")).toHaveTextContent(FORM_ERROR);
    await shareLocation();
    await confirm();
    for (const f of ["address", "locality", "pincode"] as const) expect(screen.queryByText(FIELD_MESSAGES[f])).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("reopens the map at the pinned spot with Change", async () => {
    await render(<LeadForm type="booking" />);
    await toWhereToPaint();
    await shareLocation();
    await fireEvent(map(), "regionChangeComplete", regionAt({ lat: 27.21, lng: 78.01 }), {});
    await confirm();
    await press("Change the pinned location");
    expect(map()).toHaveProp("initialRegion", regionAt({ lat: 27.21, lng: 78.01 }));
    await press("Close the map");
    expect(screen.queryByLabelText("Map. Move it to put the pin on your home")).toBeNull();
    expect(screen.getByText("Pinned on the map")).toBeOnTheScreen();
  });

  it("says calmly when location is off, links to Settings, and typing the address still works", async () => {
    loc.requestForegroundPermissionsAsync.mockResolvedValue({ ...granted, status: "denied", granted: false } as typeof granted);
    const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);
    await render(<LeadForm type="booking" />);
    await toWhereToPaint();
    await shareLocation();
    expect(screen.getByText(`Location is off for ${site.name}. Type your address below, or turn location on in Settings.`)).toBeOnTheScreen();
    expect(screen.queryByLabelText("Map. Move it to put the pin on your home")).toBeNull();
    await fireEvent.press(screen.getByRole("link", { name: "Open Settings" }));
    expect(openSettings).toHaveBeenCalled();
    await fillAddress();
    await press("Book my inspection");
    expect(router.push).toHaveBeenCalledWith(toLogin);
    expect(heldBooking()?.pin).toBeUndefined();
  });

  it("says when location services are off, without a Settings link", async () => {
    loc.hasServicesEnabledAsync.mockResolvedValue(false);
    await render(<LeadForm type="booking" />);
    await toWhereToPaint();
    await shareLocation();
    expect(screen.getByText(/^Location services are off on this phone\. Type your address below/)).toBeOnTheScreen();
    expect(screen.queryByRole("link", { name: "Open Settings" })).toBeNull();
  });

  it("opens the map over the chosen city without asking for location", async () => {
    loc.geocodeAsync.mockResolvedValue([{ latitude: 27.49, longitude: 77.67 }]);
    await render(<LeadForm type="booking" />);
    await toWhereToPaint(mathura);
    await press("Pick on the map");
    expect(loc.geocodeAsync).toHaveBeenCalledWith("Mathura, India");
    expect(map()).toHaveProp("initialRegion", regionAt({ lat: 27.49, lng: 77.67 }, CITY_DELTA));
    expect(loc.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it("opens over India when the city cannot be found, and over the only live city when no city is asked", async () => {
    await render(<LeadForm type="booking" live={[agra]} />);
    await type("Your name", "Asha Verma");
    await type("Mobile number", "9876543210");
    await press("Continue");
    await press("Pick on the map");
    expect(loc.geocodeAsync).toHaveBeenCalledWith(`${agra.name}, India`);
    expect(map()).toHaveProp("initialRegion", INDIA);
  });

  it("notes, in the site's words, a pin outside the cities we paint in, leaving the city as chosen", async () => {
    placeIs(lucknow);
    await render(<LeadForm type="booking" />);
    await toWhereToPaint(mathura);
    await shareLocation();
    await confirm();
    expect(screen.getByText(NOT_LISTED_NOTE)).toBeOnTheScreen();
    expect(screen.getByText("MG Road, Hazratganj, Lucknow")).toBeOnTheScreen();
    expect(screen.getByLabelText(`Locality in ${mathura.name}`)).toHaveProp("value", "Hazratganj");
    await press("Back");
    expect(screen.getByRole("radio", { name: mathura.name })).toBeChecked();
  });

  it("keeps what was typed when the address under the pin cannot be found", async () => {
    placeIs(null);
    await render(<LeadForm type="booking" />);
    await toWhereToPaint();
    await type("PIN code", "282005");
    await shareLocation();
    await confirm();
    expect(screen.getByText("Type the address below")).toBeOnTheScreen();
    expect(screen.getByLabelText("PIN code")).toHaveProp("value", "282005");
    expect(screen.getByLabelText("House / flat no., building and street")).toHaveProp("value", "");
    expect(screen.queryByText(NOT_LISTED_NOTE)).toBeNull();
  });

  it("does not ask for a city when only one is live, and notes a pin outside it", async () => {
    placeIs({ ...kamlaNagar, city: "Mathura", subregion: "Mathura", district: "Krishna Nagar" });
    await render(<LeadForm type="booking" live={[agra]} />);
    await type("Your name", "Asha Verma");
    await type("Mobile number", "9876543210");
    await press("Continue");
    await shareLocation();
    await confirm();
    expect(screen.getByText(NOT_LISTED_NOTE)).toBeOnTheScreen();
    expect(screen.getByLabelText(`Locality in ${agra.name}`)).toHaveProp("value", "Krishna Nagar");
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

describe("LeadForm (booking): sending it", () => {
  let auth: Auth;
  function Probe() {
    auth = useAuth();
    return null;
  }

  it("signed in, starts with the account's name and mobile, and sends the booking with the pin", async () => {
    const calls = await renderSignedIn(<LeadForm type="booking" />);
    expect(screen.getByLabelText("Your name")).toHaveProp("value", "Asha Verma");
    expect(screen.getByLabelText("Mobile number")).toHaveProp("value", "9876543210");
    await fireEvent.press(screen.getByRole("radio", { name: agra.name }));
    await press("Continue");
    await fillAddress();
    await press("Book my inspection");
    await waitFor(() => expect(router.push).toHaveBeenCalledWith({ pathname: "/thank-you", params: { type: "booking", sent: "1", project: "p-1" } }));
    const [sent] = bookingCalls(calls);
    expect(sent).toMatchObject({ method: "POST", headers: { Authorization: "Bearer saved-token" } });
    expect(sent.body).toEqual(
      JSON.parse(JSON.stringify(toBookingPayload(emptyBooking({ name: "Asha Verma", phone: "9876543210", city: "agra", address: "12, Rose Villa, Nehru Road", locality: agra.areas[0], pincode: "282005" })))),
    );
  });

  it("fills the name and mobile from the account once it loads, leaving typed answers alone", async () => {
    seedToken();
    mockApi({ "GET /api/v1/me": { data: { ...asha, name: null } } });
    await render(
      <AuthProvider>
        <LeadForm type="booking" />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByLabelText("Mobile number")).toHaveProp("value", "9876543210"));
    expect(screen.getByLabelText("Your name")).toHaveProp("value", "");
  });

  it("sends the held booking once the visitor signs in, with nothing retyped", async () => {
    const calls = mockApi({ "POST /api/v1/auth/verify": { data: { user: asha, token: "new-token", expiresAt: "2027-01-29T00:00:00.000Z" } }, "POST /api/v1/bookings": booked });
    await render(
      <AuthProvider>
        <LeadForm type="booking" />
        <Probe />
      </AuthProvider>,
    );
    await toWhereToPaint();
    await fillAddress();
    await press("Book my inspection");
    expect(router.push).toHaveBeenLastCalledWith(toLogin);
    expect(bookingCalls(calls)).toHaveLength(0);
    // the login screen signs in; the form under it sends the booking
    await act(async () => void (await auth.signIn("9876543210", "123456")));
    await waitFor(() => expect(router.push).toHaveBeenLastCalledWith({ pathname: "/thank-you", params: { type: "booking", sent: "1", project: "p-1" } }));
    expect(bookingCalls(calls)).toHaveLength(1);
    expect(bookingCalls(calls)[0]).toMatchObject({ headers: { Authorization: "Bearer new-token" }, body: { name: "Asha Verma", phone: "9876543210", pincode: "282005", city: "agra" } });
    expect(heldBooking()).toBeNull();
  });

  it("opened again after signing in, takes the held booking back and sends it", async () => {
    const values = emptyBooking({ name: "Asha Verma", phone: "9876543210", city: "agra", address: "12, Rose Villa, Nehru Road", locality: "Kamla Nagar", pincode: "282005" });
    holdBooking({ path: "/book", values, pin: { coords: { lat: 27.2, lng: 78.0 }, short: "Kamla Nagar, Agra", outside: false } });
    const calls = await renderSignedIn(<LeadForm type="booking" />);
    await waitFor(() => expect(router.push).toHaveBeenCalledWith({ pathname: "/thank-you", params: { type: "booking", sent: "1", project: "p-1" } }));
    expect(bookingCalls(calls)[0].body).toMatchObject({ address: "12, Rose Villa, Nehru Road", location: { lat: 27.2, lng: 78 } });
    expect(screen.getByText("Pinned on the map")).toBeOnTheScreen();
  });

  it("does not take a booking held on another screen", async () => {
    holdBooking({ path: "/services/interior-painting/agra", values: emptyBooking({ name: "Someone" }) });
    const calls = await renderSignedIn(<LeadForm type="booking" />);
    expect(screen.getByLabelText("Your name")).toHaveProp("value", "Asha Verma");
    expect(bookingCalls(calls)).toHaveLength(0);
    expect(heldBooking()).not.toBeNull();
  });

  it("shows the API's message on the field it names, back on the first step", async () => {
    await renderSignedIn(<LeadForm type="booking" />, {
      status: 400,
      error: { code: "invalid_request", message: "Please check the highlighted fields.", details: { phone: "Use the mobile number you signed in with (******3210)" } },
    });
    await type("Mobile number", "9999999999");
    await fireEvent.press(screen.getByRole("radio", { name: agra.name }));
    await press("Continue");
    await fillAddress();
    await press("Book my inspection");
    expect(await screen.findByText("Use the mobile number you signed in with (******3210)")).toBeOnTheScreen();
    expect(step()).toHaveAccessibilityValue({ now: 1 });
    expect(screen.getByRole("alert")).toHaveTextContent(FORM_ERROR);
    await waitFor(() => expect(focused()).toBe("Mobile number"));
    expect(router.push).not.toHaveBeenCalled();
  });

  it("shows the API's one message when it cannot take the booking now, staying on the step", async () => {
    await renderSignedIn(<LeadForm type="booking" />, { status: 429, error: { code: "rate_limited", message: "Too many requests. Try again in 40 seconds.", details: { retryAfterSeconds: 40 } } });
    await fireEvent.press(screen.getByRole("radio", { name: agra.name }));
    await press("Continue");
    await fillAddress();
    await press("Book my inspection");
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many requests. Try again in 40 seconds.");
    expect(step()).toHaveAccessibilityValue({ now: 2 });
  });

  it("asks for sign-in again when the session has expired", async () => {
    await renderSignedIn(<LeadForm type="booking" />, { status: 401, error: { code: "unauthenticated", message: "Sign in to continue: your session is missing or has expired." } });
    await fireEvent.press(screen.getByRole("radio", { name: agra.name }));
    await press("Continue");
    await fillAddress();
    await press("Book my inspection");
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(toLogin));
    expect(heldBooking()?.values.pincode).toBe("282005");
    expect(screen.getByText(SIGN_IN_NOTE)).toBeOnTheScreen();
  });
});
