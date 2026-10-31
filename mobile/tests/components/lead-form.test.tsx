import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { AccessibilityInfo } from "react-native";

import { LeadForm, localityChoices, SIGN_IN_NOTE } from "~/components/site/LeadForm";
import { AuthProvider, useAuth, type Auth } from "~/lib/auth-context";
import { emptyBooking, toBookingPayload } from "~/lib/booking";
import { heldBooking, holdBooking, releaseBooking } from "~/lib/pending-booking";
import { FORM_ERROR } from "~/lib/leads";
import { NOT_LISTED_NOTE } from "~/lib/location";
import { FIELD_MESSAGES, liveCities, type City } from "~/shared";
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
const area = (city: City) => `Area / locality in ${city.name}`;

/** Everything a booking asks: name, mobile, city and area. */
async function fillBooking(city: City = agra) {
  await type("Your name", "Asha Verma");
  await type("Mobile number", "98765 43210");
  await fireEvent.press(screen.getByRole("radio", { name: city.name }));
  await type(area(city), city.areas[0]);
}

beforeEach(() => {
  jest.clearAllMocks();
  releaseBooking();
});

const toLogin = { pathname: "/login", params: { next: "/book", resume: "booking" } };
const booked: Answer = { status: 201, data: { received: true, projectId: "p-1" } };
const thanks = { pathname: "/thank-you", params: { type: "booking", sent: "1", project: "p-1" } };

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

describe("LeadForm (booking): who and where", () => {
  it("asks only name, mobile, the city as pills and the area, on one form with no steps, address or job fields", async () => {
    await render(<LeadForm type="booking" />);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByLabelText("Your name")).toBeOnTheScreen();
    expect(screen.getByLabelText("Mobile number")).toBeOnTheScreen();
    for (const c of live) expect(screen.getByRole("radio", { name: c.name })).not.toBeChecked();
    expect(screen.getByLabelText("Area / locality")).toBeOnTheScreen();
    for (const label of ["House / flat no., building and street", "PIN code", "What needs painting?"]) expect(screen.queryByLabelText(label)).toBeNull();
    expect(screen.queryByRole("button", { name: "Use my current location" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(screen.getByRole("button", { name: "Book my site visit" })).toBeOnTheScreen();
    expect(screen.getByText(/Add the address and what needs painting later in your account/)).toBeOnTheScreen();
    expect(screen.queryByText("Added to your booking")).toBeNull();
  });

  it("starts with the city chosen on a city's own page, and ignores a city that is not live", async () => {
    const { rerender } = await render(<LeadForm type="booking" defaultCity="mathura" />);
    expect(screen.getByRole("radio", { name: "Mathura" })).toBeChecked();
    expect(screen.getByLabelText(area(mathura))).toBeOnTheScreen();
    await rerender(<LeadForm key="soon" type="booking" defaultCity="bangalore" />);
    for (const name of ["Agra", "Mathura", "Vrindavan"]) expect(screen.getByRole("radio", { name })).not.toBeChecked();
  });

  it("shows the website's message for every field left empty, focusing the first, and sends nothing", async () => {
    await render(<LeadForm type="booking" />);
    await press("Book my site visit");
    for (const f of ["name", "phone", "city", "locality"] as const) expect(screen.getByText(FIELD_MESSAGES[f])).toBeOnTheScreen();
    expect(screen.queryByText(FIELD_MESSAGES.address)).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent(FORM_ERROR);
    expect(focused()).toBe("Your name");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("moves the screen reader to the city pills when the city is the only thing missing, and drops the form line once fixed", async () => {
    await render(<LeadForm type="booking" />);
    await type("Your name", "Asha Verma");
    await type("Mobile number", "9876543210");
    await type("Area / locality", "Dayalbagh");
    await press("Book my site visit");
    expect(screen.getByText(FIELD_MESSAGES.city)).toBeOnTheScreen();
    expect(AccessibilityInfo.sendAccessibilityEvent).toHaveBeenCalledWith(expect.anything(), "focus");
    await fireEvent.press(screen.getByRole("radio", { name: mathura.name }));
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
    await fireEvent.changeText(phone, "9876543210");
    expect(screen.queryByText(FIELD_MESSAGES.phone)).toBeNull();
  });

  it("goes from the name to the mobile number with the keyboard's next key", async () => {
    await render(<LeadForm type="booking" />);
    await fireEvent(screen.getByLabelText("Your name"), "submitEditing");
    expect(focused()).toBe("Mobile number");
  });

  it("offers the chosen city's localities as pills, narrowing as the visitor types, keeps free text and notes an unlisted one", async () => {
    await render(<LeadForm type="booking" />);
    await fireEvent.press(screen.getByRole("radio", { name: mathura.name }));
    const locality = screen.getByLabelText(area(mathura));
    expect(screen.getByLabelText(`Localities in ${mathura.name}`)).toBeOnTheScreen();
    expect(screen.queryByRole("radio", { name: agra.areas[0] })).toBeNull();
    await fireEvent.press(screen.getByRole("radio", { name: mathura.areas[1] }));
    expect(locality).toHaveProp("value", mathura.areas[1]);
    await fireEvent.changeText(locality, "nagar");
    expect(screen.getAllByRole("radio").filter((r) => mathura.areas.includes(r.props.accessibilityLabel)).map((r) => r.props.accessibilityLabel)).toEqual(
      mathura.areas.filter((a) => a.toLowerCase().includes("nagar")),
    );
    expect(screen.queryByText(NOT_LISTED_NOTE)).toBeNull();
    await fireEvent.changeText(locality, "Sector 9");
    expect(screen.queryByLabelText(`Localities in ${mathura.name}`)).toBeNull();
    expect(screen.getByText(NOT_LISTED_NOTE)).toBeOnTheScreen();
  });

  it("asks no city when only one is live, offering its localities straight away", async () => {
    await render(<LeadForm type="booking" live={[agra]} />);
    expect(screen.queryByRole("radio", { name: agra.name })).toBeNull();
    expect(screen.getByLabelText(area(agra))).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: agra.areas[0] })).toBeOnTheScreen();
  });

  it("links to the privacy policy screen", async () => {
    await render(<LeadForm type="booking" />);
    await fireEvent.press(screen.getByRole("link", { name: "privacy policy" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/privacy-policy", params: {} });
  });
});

describe("LeadForm (booking): what the page added", () => {
  it("shows the service and note under “Added to your booking”, and sends them along", async () => {
    const calls = await renderSignedIn(<LeadForm type="booking" defaultService="Interior Painting" defaultMessage="Interested in Asian Paints 8386 Pepper Leaf" />);
    expect(screen.getByText("Added to your booking")).toBeOnTheScreen();
    expect(screen.getByText("Interior Painting")).toBeOnTheScreen();
    expect(screen.getByText("Interested in Asian Paints 8386 Pepper Leaf")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("radio", { name: agra.name }));
    await type(area(agra), agra.areas[0]);
    await press("Book my site visit");
    await waitFor(() => expect(bookingCalls(calls)).toHaveLength(1));
    expect(bookingCalls(calls)[0].body).toMatchObject({ service: "Interior Painting", message: "Interested in Asian Paints 8386 Pepper Leaf" });
  });

  it("holds its place in a skeleton while the shade is on its way, then shows the note", async () => {
    const { rerender } = await render(<LeadForm type="booking" defaultService="Interior Painting" carrying />);
    expect(screen.getByLabelText("Adding the shade you picked")).toBeBusy();
    await rerender(<LeadForm key="note" type="booking" defaultMessage="Interested in Pepper Leaf." carrying />);
    expect(screen.getByText("Interested in Pepper Leaf.")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Adding the shade you picked")).toBeNull();
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

  it("signed out, holds the booking and opens the login screen, saying a code comes first", async () => {
    await render(<LeadForm type="booking" />);
    expect(screen.getByText(SIGN_IN_NOTE)).toBeOnTheScreen();
    await fillBooking();
    await press("Book my site visit");
    expect(router.push).toHaveBeenCalledWith(toLogin);
    expect(heldBooking()).toMatchObject({ path: "/book", values: { name: "Asha Verma", phone: "98765 43210", city: "agra", locality: agra.areas[0] } });
    expect(heldBooking()?.pin).toBeUndefined();
  });

  it("signed in, starts with the account's name and mobile, and sends who and where", async () => {
    const calls = await renderSignedIn(<LeadForm type="booking" />);
    expect(screen.getByLabelText("Your name")).toHaveProp("value", "Asha Verma");
    expect(screen.getByLabelText("Mobile number")).toHaveProp("value", "9876543210");
    expect(screen.queryByText(SIGN_IN_NOTE)).toBeNull();
    await fireEvent.press(screen.getByRole("radio", { name: agra.name }));
    await type(area(agra), agra.areas[0]);
    await press("Book my site visit");
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(thanks));
    const [sent] = bookingCalls(calls);
    expect(sent).toMatchObject({ method: "POST", headers: { Authorization: "Bearer saved-token" } });
    expect(sent.body).toEqual(JSON.parse(JSON.stringify(toBookingPayload(emptyBooking({ name: "Asha Verma", phone: "9876543210", city: "agra", locality: agra.areas[0] })))));
    expect(sent.body).not.toHaveProperty("location");
  });

  it("hands the result to onDone instead when given, with the note under the button", async () => {
    const onDone = jest.fn();
    await renderSignedIn(<LeadForm type="booking" onDone={onDone} footnote="Zero advance payment." />);
    expect(screen.getByText("Zero advance payment.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("radio", { name: agra.name }));
    await type(area(agra), agra.areas[0]);
    await press("Book my site visit");
    await waitFor(() => expect(onDone).toHaveBeenCalledWith({ sent: true, projectId: "p-1" }));
    expect(router.push).not.toHaveBeenCalled();
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
    await fillBooking();
    await press("Book my site visit");
    expect(router.push).toHaveBeenLastCalledWith(toLogin);
    expect(bookingCalls(calls)).toHaveLength(0);
    // the login screen signs in; the form under it sends the booking
    await act(async () => void (await auth.signIn("9876543210", "123456")));
    await waitFor(() => expect(router.push).toHaveBeenLastCalledWith(thanks));
    expect(bookingCalls(calls)).toHaveLength(1);
    expect(bookingCalls(calls)[0]).toMatchObject({ headers: { Authorization: "Bearer new-token" }, body: { name: "Asha Verma", phone: "9876543210", city: "agra", locality: agra.areas[0] } });
    expect(heldBooking()).toBeNull();
  });

  it("opened again after signing in, takes the held booking back and sends it", async () => {
    holdBooking({ path: "/book", values: emptyBooking({ name: "Asha Verma", phone: "9876543210", city: "agra", locality: "Kamla Nagar" }) });
    const calls = await renderSignedIn(<LeadForm type="booking" />);
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(thanks));
    expect(bookingCalls(calls)[0].body).toMatchObject({ locality: "Kamla Nagar", city: "agra" });
  });

  it("does not take a booking held on another screen", async () => {
    holdBooking({ path: "/services/interior-painting/agra", values: emptyBooking({ name: "Someone" }) });
    const calls = await renderSignedIn(<LeadForm type="booking" />);
    expect(screen.getByLabelText("Your name")).toHaveProp("value", "Asha Verma");
    expect(bookingCalls(calls)).toHaveLength(0);
    expect(heldBooking()).not.toBeNull();
  });

  it("shows the API's message on the field it names and focuses it", async () => {
    await renderSignedIn(<LeadForm type="booking" />, {
      status: 400,
      error: { code: "invalid_request", message: "Please check the highlighted fields.", details: { phone: "Use the mobile number you signed in with (******3210)" } },
    });
    await type("Mobile number", "9999999999");
    await fireEvent.press(screen.getByRole("radio", { name: agra.name }));
    await type(area(agra), agra.areas[0]);
    await press("Book my site visit");
    expect(await screen.findByText("Use the mobile number you signed in with (******3210)")).toBeOnTheScreen();
    expect(screen.getByRole("alert")).toHaveTextContent(FORM_ERROR);
    await waitFor(() => expect(focused()).toBe("Mobile number"));
    expect(router.push).not.toHaveBeenCalled();
  });

  it("shows the API's one message when it cannot take the booking now", async () => {
    await renderSignedIn(<LeadForm type="booking" />, { status: 429, error: { code: "rate_limited", message: "Too many requests. Try again in 40 seconds.", details: { retryAfterSeconds: 40 } } });
    await fireEvent.press(screen.getByRole("radio", { name: agra.name }));
    await type(area(agra), agra.areas[0]);
    await press("Book my site visit");
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many requests. Try again in 40 seconds.");
  });

  it("asks for sign-in again when the session has expired", async () => {
    await renderSignedIn(<LeadForm type="booking" />, { status: 401, error: { code: "unauthenticated", message: "Sign in to continue: your session is missing or has expired." } });
    await fireEvent.press(screen.getByRole("radio", { name: agra.name }));
    await type(area(agra), agra.areas[0]);
    await press("Book my site visit");
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(toLogin));
    expect(heldBooking()?.values.locality).toBe(agra.areas[0]);
    expect(screen.getByText(SIGN_IN_NOTE)).toBeOnTheScreen();
  });
});
