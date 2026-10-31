import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as Location from "expo-location";
import { Linking } from "react-native";

import { ProjectSteps, stepSummary } from "~/components/account/ProjectSteps";
import { ProjectTracker } from "~/components/account/Tracker";
import { AuthProvider } from "~/lib/auth-context";
import { CITY_DELTA, regionAt, type Place } from "~/lib/location";
import type { ProjectDetail } from "~/lib/projects";
import { FIELD_MESSAGES, site } from "~/shared";
import { asha, detail, mockApi, offline, seedToken, type Answer } from "./helpers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  usePathname: jest.fn(() => "/account/projects/p"),
  useLocalSearchParams: jest.fn(() => ({})),
}));

const ID = "3f0c2b1a-1111-4222-8333-444455556666";
const PATCH = `PATCH /api/v1/projects/${ID}`;
/** A fresh booking: who and where only, before the inspection. */
const fresh = (over: Partial<ProjectDetail> = {}) =>
  detail({ id: ID, stage: "booked", stageLabel: "Booking received", address: null, pincode: null, service: null, locality: "Kamla Nagar", city: "Agra", citySlug: "agra", detailsEditable: true, quotations: [], inspection: null, ...over });

const press = (name: string | RegExp) => fireEvent.press(screen.getByRole("button", { name }));
const type = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);

/** The steps inside a signed-in session; `patch` answers the project API. */
async function renderSteps(project: ProjectDetail, patch: Answer | Answer[] = { data: project }) {
  seedToken();
  const calls = mockApi({ "GET /api/v1/me": { data: asha }, [PATCH]: patch });
  const onSaved = jest.fn();
  await render(
    <AuthProvider>
      <ProjectSteps project={project} onSaved={onSaved} />
    </AuthProvider>,
  );
  await waitFor(() => expect(calls.some((c) => c.path === "/api/v1/me")).toBe(true));
  return { calls, onSaved, patches: () => calls.filter((c) => c.method === "PATCH") };
}

beforeEach(() => jest.clearAllMocks());

describe("the steps to complete", () => {
  it("lists the address and the job with the progress, and opens the address with the booking's area", async () => {
    await renderSteps(fresh());
    expect(screen.getByRole("header", { name: "Steps to complete" })).toBeOnTheScreen();
    expect(screen.getByText("0 of 2 done")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Add your address, to do" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Tell us about the job, to do" })).toBeOnTheScreen();
    expect(screen.getByLabelText("Area / locality")).toHaveProp("value", "Kamla Nagar");
    expect(screen.getByRole("button", { name: "Use my current location" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Add the job details" })).toBeOnTheScreen();
    expect(screen.queryByLabelText("What needs painting?")).toBeNull();
  });

  it("checks the address with the website's words before sending anything", async () => {
    const { patches } = await renderSteps(fresh());
    await type("PIN code", "2820");
    await press("Save");
    expect(screen.getByText(FIELD_MESSAGES.address)).toBeOnTheScreen();
    expect(screen.getByText(FIELD_MESSAGES.pincode)).toBeOnTheScreen();
    expect(screen.getByRole("alert")).toBeOnTheScreen();
    await type("PIN code", "282005");
    expect(screen.queryByText(FIELD_MESSAGES.pincode)).toBeNull();
    expect(patches()).toHaveLength(0);
  });

  it("saves the address, hands the project back and moves on to the job", async () => {
    const saved = fresh({ address: "12, Rose Villa, Nehru Road", pincode: "282005" });
    const { onSaved, patches } = await renderSteps(fresh(), { data: saved });
    await type("House / flat no., building and street", "12, Rose Villa, Nehru Road");
    await type("PIN code", "282005");
    await press("Save");
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(patches()[0]).toMatchObject({ headers: { Authorization: "Bearer saved-token" }, body: { address: "12, Rose Villa, Nehru Road", locality: "Kamla Nagar", pincode: "282005" } });
    expect(patches()[0].body).not.toHaveProperty("location");
    expect(screen.getByLabelText("What needs painting?")).toBeOnTheScreen();
  });

  it("asks what needs painting, sends the job and shows the API's field messages", async () => {
    const { patches, onSaved } = await renderSteps(fresh({ address: "12 Rose Villa", pincode: "282005" }), {
      status: 400,
      error: { code: "invalid_request", message: "Please check the highlighted fields.", details: { preferredDate: "Choose today or a later date" } },
    });
    await press("Save");
    expect(screen.getByText("Choose what needs painting")).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText("What needs painting?"));
    await press("Interior Painting");
    await type("Carpet area per floor, sq ft", "50");
    await press("Save");
    expect(screen.getByText(/Enter the carpet area in sq ft/)).toBeOnTheScreen();
    expect(patches()).toHaveLength(0);
    await type("Carpet area per floor, sq ft", "1200");
    await type("Anything we should know?", "Damp near the balcony");
    await press("Save");
    expect(await screen.findByText("Choose today or a later date")).toBeOnTheScreen();
    expect(patches()[0].body).toMatchObject({ service: "Interior Painting", carpetArea: "1200", notes: "Damp near the balcony" });
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("says what went wrong when the request fails outright", async () => {
    await renderSteps(fresh({ address: "12 Rose Villa", pincode: "282005" }), offline);
    await fireEvent.press(screen.getByLabelText("What needs painting?"));
    await press("Exterior Painting");
    await press("Save");
    expect(await screen.findByRole("alert")).toBeOnTheScreen();
  });

  it("shows what a done step has, with Edit and Cancel, and says so when everything is done", async () => {
    const all = fresh({ address: "12 Rose Villa", pincode: "282005", service: "Interior Painting", homeSize: "2 BHK", preferredDate: "2026-12-01" });
    await renderSteps(all);
    expect(screen.getByText("2 of 2 done")).toBeOnTheScreen();
    expect(screen.getByText(/All done/)).toBeOnTheScreen();
    expect(screen.getByText(stepSummary("job", all))).toBeOnTheScreen();
    expect(stepSummary("job", all)).toBe("Interior Painting · 2 BHK · visit from 2026-12-01");
    expect(screen.getByText(stepSummary("address", all))).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole("button", { name: "Edit" })[0]);
    expect(screen.getByLabelText("House / flat no., building and street")).toHaveProp("value", "12 Rose Villa");
    await press("Cancel");
    expect(screen.queryByLabelText("House / flat no., building and street")).toBeNull();
  });
});

describe("the address from the map", () => {
  const loc = jest.mocked(Location);
  const granted = { status: "granted", granted: true, canAskAgain: true, expires: "never" } as Awaited<ReturnType<typeof Location.requestForegroundPermissionsAsync>>;
  const home = { lat: 27.2046, lng: 78.0042 };
  const kamlaNagar: Place = { name: "12 Nehru Road", streetNumber: "12", street: "Nehru Road", district: "Kamla Nagar", city: "Agra", subregion: "Agra", postalCode: "282005" };
  const map = () => screen.getByLabelText("Map. Move it to put the pin on your home");

  beforeEach(() => {
    loc.requestForegroundPermissionsAsync.mockResolvedValue(granted);
    loc.hasServicesEnabledAsync.mockResolvedValue(true);
    loc.getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: home.lat, longitude: home.lng, altitude: null, accuracy: 5, altitudeAccuracy: null, heading: null, speed: null }, timestamp: 0 });
    loc.getLastKnownPositionAsync.mockResolvedValue(null);
    loc.geocodeAsync.mockResolvedValue([]);
    loc.reverseGeocodeAsync.mockResolvedValue([kamlaNagar as Location.LocationGeocodedAddress]);
  });

  it("asks for location only on a tap, fills the address from the pin and sends the pin with it", async () => {
    const { patches } = await renderSteps(fresh());
    expect(loc.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    await press("Use my current location");
    expect(map()).toHaveProp("initialRegion", regionAt(home));
    await press("Confirm this location");
    expect(screen.getByLabelText("House / flat no., building and street")).toHaveProp("value", "12 Nehru Road");
    expect(screen.getByLabelText("PIN code")).toHaveProp("value", "282005");
    // the pinned spot can be moved again
    await press("Pinned on the map: change");
    expect(map()).toHaveProp("initialRegion", regionAt(home));
    await press("Close the map");
    await press("Save");
    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0].body).toMatchObject({ address: "12 Nehru Road", locality: "Kamla Nagar", pincode: "282005", location: home });
  });

  it("opens the map over the project's city without asking for location", async () => {
    loc.geocodeAsync.mockResolvedValue([{ latitude: 27.18, longitude: 78.01 }]);
    await renderSteps(fresh());
    await press("Pick on the map");
    expect(loc.geocodeAsync).toHaveBeenCalledWith("Agra, India");
    expect(map()).toHaveProp("initialRegion", regionAt({ lat: 27.18, lng: 78.01 }, CITY_DELTA));
    expect(loc.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it("keeps what was typed when the place under the pin cannot be found", async () => {
    loc.reverseGeocodeAsync.mockResolvedValue([]);
    await renderSteps(fresh());
    await type("PIN code", "282005");
    await press("Use my current location");
    await press("Confirm this location");
    expect(screen.getByLabelText("PIN code")).toHaveProp("value", "282005");
    expect(screen.getByLabelText("House / flat no., building and street")).toHaveProp("value", "");
  });

  it("says calmly when location is off and links to Settings; typing still works", async () => {
    loc.requestForegroundPermissionsAsync.mockResolvedValue({ ...granted, status: "denied", granted: false } as typeof granted);
    const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);
    await renderSteps(fresh());
    await press("Use my current location");
    expect(screen.getByText(`Location is off for ${site.name}. Type your address below, or turn location on in Settings.`)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Open Settings" }));
    expect(openSettings).toHaveBeenCalled();
  });
});

describe("on the project screen", () => {
  it("shows the saved project in place", async () => {
    seedToken();
    const saved = fresh({ address: "12 Rose Villa", pincode: "282005" });
    mockApi({ "GET /api/v1/me": { data: asha }, [`GET /api/v1/projects/${ID}`]: { data: fresh() }, [PATCH]: { data: saved } });
    await render(
      <AuthProvider>
        <ProjectTracker id={ID} />
      </AuthProvider>,
    );
    await screen.findByRole("header", { name: "Steps to complete" });
    await type("House / flat no., building and street", "12 Rose Villa");
    await type("PIN code", "282005");
    await press("Save");
    expect(await screen.findByText("1 of 2 done")).toBeOnTheScreen();
    expect(screen.getByText("12 Rose Villa, Kamla Nagar, Agra 282005")).toBeOnTheScreen();
  });

  it("shows the steps while the address and job can be added, and not after the inspection", async () => {
    seedToken();
    mockApi({ "GET /api/v1/me": { data: asha }, [`GET /api/v1/projects/${ID}`]: [{ data: fresh() }] });
    const { unmount } = await render(
      <AuthProvider>
        <ProjectTracker id={ID} />
      </AuthProvider>,
    );
    expect(await screen.findByRole("header", { name: "Steps to complete" })).toBeOnTheScreen();
    unmount();
    mockApi({ "GET /api/v1/me": { data: asha }, [`GET /api/v1/projects/${ID}`]: { data: detail({ id: ID }) } });
    const second = await render(
      <AuthProvider>
        <ProjectTracker id={ID} />
      </AuthProvider>,
    );
    expect(await screen.findByRole("header", { name: "Every step" })).toBeOnTheScreen();
    expect(screen.queryByRole("header", { name: "Steps to complete" })).toBeNull();
    second.unmount();
  });
});
