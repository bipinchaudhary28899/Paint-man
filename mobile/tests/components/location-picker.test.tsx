import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as Location from "expo-location";
import { Linking } from "react-native";
import { getAnimatedStyle, useReducedMotion } from "react-native-reanimated";
import type { TestInstance } from "test-renderer";

import { LocationPicker, PIN_LIFT } from "~/components/site/LocationPicker";
import { LOOKUP_FAILED, regionAt, STREET_DELTA, type Place } from "~/lib/location";
import { site } from "~/shared";
import { colors } from "~/theme";
import { contrastFindings, controlAndImageFindings, reachable, targetFindings } from "../a11y/audit";

jest.mock("react-native-reanimated", () => {
  const actual = jest.requireActual("react-native-reanimated");
  return { __esModule: true, ...actual, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

const loc = jest.mocked(Location);
const { animateToRegion, centrePoint } = jest.requireMock("react-native-maps") as { animateToRegion: jest.Mock; centrePoint: { value?: { x: number; y: number } } };
const reduced = jest.mocked(useReducedMotion);

const granted = { status: "granted", granted: true, canAskAgain: true, expires: "never" } as Awaited<ReturnType<typeof Location.requestForegroundPermissionsAsync>>;
const denied = { ...granted, status: "denied", granted: false } as typeof granted;
const position = (lat: number, lng: number) => ({ coords: { latitude: lat, longitude: lng, altitude: null, accuracy: 5, altitudeAccuracy: null, heading: null, speed: null }, timestamp: 0 });

const home = { lat: 27.2046, lng: 78.0042 };
const start = regionAt(home);
const kamlaNagar: Place = { name: "12 Nehru Road", streetNumber: "12", street: "Nehru Road", district: "Kamla Nagar", city: "Agra", subregion: "Agra", postalCode: "282005" };
const dayalbagh: Place = { name: "Rose Villa", district: "Dayalbagh", city: "Agra", postalCode: "282005" };

const map = () => screen.getByLabelText("Map. Move it to put the pin on your home");
const pinY = () => {
  const style = (getAnimatedStyle as unknown as (el: unknown) => { transform?: { translateY: number }[] })(screen.getByTestId("location-pin", { includeHiddenElements: true }));
  // + 0 reads -0 (a resting pin's -16 × 0) as 0
  return (style.transform?.[0]?.translateY ?? 0) + 0;
};
const moveTo = async (lat: number, lng: number) => {
  await fireEvent(map(), "regionChangeStart", regionAt({ lat, lng }), {});
  await fireEvent(map(), "regionChangeComplete", regionAt({ lat, lng }), {});
};

function setup(props: Partial<Parameters<typeof LocationPicker>[0]> = {}) {
  const onConfirm = jest.fn();
  const onClose = jest.fn();
  const onLocated = jest.fn();
  return { onConfirm, onClose, onLocated, view: render(<LocationPicker start={start} onConfirm={onConfirm} onClose={onClose} onLocated={onLocated} {...props} />) };
}

beforeEach(() => {
  jest.clearAllMocks();
  reduced.mockReturnValue(false);
  loc.reverseGeocodeAsync.mockImplementation(async ({ latitude }) => [(latitude === home.lat ? kamlaNagar : dayalbagh) as Location.LocationGeocodedAddress]);
  loc.requestForegroundPermissionsAsync.mockResolvedValue(granted);
  loc.hasServicesEnabledAsync.mockResolvedValue(true);
  loc.getCurrentPositionAsync.mockResolvedValue(position(home.lat, home.lng));
  loc.getLastKnownPositionAsync.mockResolvedValue(null);
});

describe("LocationPicker", () => {
  it("opens on the map with the pin at its centre, the instruction, and the address under the pin once looked up", async () => {
    await setup().view;
    expect(map()).toHaveProp("initialRegion", start);
    expect(screen.getByText("Move the map to put the pin on your home")).toBeOnTheScreen();
    // the pin is drawn for the eye only
    expect(screen.queryByTestId("location-pin")).toBeNull();
    expect(screen.getByLabelText("Finding the address")).toBeBusy();
    expect(await screen.findByText("12 Nehru Road, Kamla Nagar, Agra")).toBeOnTheScreen();
    expect(loc.reverseGeocodeAsync).toHaveBeenCalledWith({ latitude: home.lat, longitude: home.lng });
    expect(loc.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it("stands the pin's tip on the point the map reports as its centre (Apple Maps centres in its safe area)", async () => {
    centrePoint.value = { x: 196, y: 420 };
    try {
      await render(<LocationPicker start={start} onConfirm={jest.fn()} onClose={jest.fn()} />);
      const layer = screen.getByTestId("pin-layer", { includeHiddenElements: true });
      // before the map answers, the pin sits in the middle of the view
      expect(layer.children[0]).not.toHaveStyle({ position: "absolute" });
      await fireEvent(map(), "mapReady");
      // the pin box is twice the pin's height with the tip at its centre: 30 wide, its top 44 above the tip
      await waitFor(() => expect(layer.children[0]).toHaveStyle({ position: "absolute", left: 181, top: 376 }));
      // a later report of the same point changes nothing; a new one moves the pin
      await moveTo(27.21, 78.01);
      centrePoint.value = { x: 196, y: 400 };
      await moveTo(27.22, 78.02);
      await waitFor(() => expect(layer.children[0]).toHaveStyle({ top: 356 }));
    } finally {
      centrePoint.value = undefined;
    }
  });

  it("keeps the pin in the middle when the map cannot say where its centre is", async () => {
    await render(<LocationPicker start={start} onConfirm={jest.fn()} onClose={jest.fn()} />);
    await fireEvent(map(), "mapReady");
    await moveTo(27.21, 78.01);
    expect(screen.getByTestId("pin-layer", { includeHiddenElements: true }).children[0]).not.toHaveStyle({ position: "absolute" });
  });

  it("lifts the pin while the map moves and drops it where the map stops, looking the address up once", async () => {
    await setup().view;
    await screen.findByText("12 Nehru Road, Kamla Nagar, Agra");
    await fireEvent(map(), "regionChangeStart", start, {});
    await fireEvent(map(), "regionChange", start, {});
    await waitFor(() => expect(pinY()).toBe(-PIN_LIFT));
    expect(screen.getByLabelText("Finding the address")).toBeOnTheScreen();
    // two quick stops: only the last spot is looked up
    await fireEvent(map(), "regionChangeComplete", regionAt({ lat: 27.21, lng: 78.01 }), {});
    await moveTo(27.22, 78.02);
    await waitFor(() => expect(pinY()).toBe(0));
    expect(await screen.findByText("Rose Villa, Dayalbagh, Agra")).toBeOnTheScreen();
    expect(loc.reverseGeocodeAsync).toHaveBeenCalledTimes(2);
    expect(loc.reverseGeocodeAsync).toHaveBeenLastCalledWith({ latitude: 27.22, longitude: 78.02 });
  });

  it("keeps the pin still under reduce motion, and moves the map without animating", async () => {
    reduced.mockReturnValue(true);
    await setup().view;
    await fireEvent(map(), "regionChangeStart", start, {});
    await new Promise((r) => setTimeout(r, 200));
    expect(pinY()).toBe(0);
    await fireEvent(map(), "press", { nativeEvent: { coordinate: { latitude: 27.21, longitude: 78.01 } } });
    expect(animateToRegion).toHaveBeenCalledWith({ latitude: 27.21, longitude: 78.01, latitudeDelta: STREET_DELTA, longitudeDelta: STREET_DELTA }, 0);
  });

  it("moves the pin to a spot tapped on the map, keeping the zoom", async () => {
    await setup().view;
    await fireEvent(map(), "regionChangeComplete", regionAt(home, 0.01), {});
    await fireEvent(map(), "press", { nativeEvent: { coordinate: { latitude: 27.21, longitude: 78.01 } } });
    expect(animateToRegion).toHaveBeenCalledWith({ latitude: 27.21, longitude: 78.01, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 350);
    expect(await screen.findByText("Rose Villa, Dayalbagh, Agra")).toBeOnTheScreen();
  });

  it("goes back to the phone's position with Locate me, without asking again when it is known", async () => {
    await setup({ gps: home }).view;
    expect(map()).toHaveProp("showsUserLocation", true);
    await moveTo(27.22, 78.02);
    await fireEvent.press(screen.getByRole("button", { name: "Locate me" }));
    expect(animateToRegion).toHaveBeenLastCalledWith(regionAt(home), 350);
    expect(loc.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it("asks for location on Locate me when the map opened without it, then goes there", async () => {
    const { onLocated, view } = setup();
    await view;
    expect(map()).toHaveProp("showsUserLocation", false);
    await fireEvent.press(screen.getByRole("button", { name: "Locate me" }));
    expect(loc.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(onLocated).toHaveBeenCalledWith(home);
    expect(animateToRegion).toHaveBeenLastCalledWith(regionAt(home), 350);
    expect(map()).toHaveProp("showsUserLocation", true);
  });

  it("says calmly when location is off, with a way to Settings, and the map still works", async () => {
    loc.requestForegroundPermissionsAsync.mockResolvedValue(denied);
    const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);
    await setup().view;
    await fireEvent.press(screen.getByRole("button", { name: "Locate me" }));
    expect(screen.getByText(`Location is off for ${site.name}. Move the map to your home, or turn location on in Settings.`)).toBeOnTheScreen();
    expect(animateToRegion).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("link", { name: "Open Settings" }));
    expect(openSettings).toHaveBeenCalled();
    expect(await screen.findByText("12 Nehru Road, Kamla Nagar, Agra")).toBeOnTheScreen();
  });

  it("confirms the spot under the pin with its address, looking it up at once if the pause is not over", async () => {
    const { onConfirm, view } = setup();
    await view;
    await moveTo(27.2212345678, 78.0298765432);
    await fireEvent.press(screen.getByRole("button", { name: "Confirm this location" }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({ coords: { lat: 27.221235, lng: 78.029877 }, place: dayalbagh }));
  });

  it("still confirms the pin when the address cannot be looked up", async () => {
    loc.reverseGeocodeAsync.mockRejectedValue(new Error("offline"));
    const { onConfirm, view } = setup();
    await view;
    expect(await screen.findByText(LOOKUP_FAILED)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Confirm this location" }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({ coords: home, place: null }));
    // a failed spot is tried again next time
    expect(loc.reverseGeocodeAsync).toHaveBeenCalledTimes(2);
  });

  it("closes with its close control and the system back gesture", async () => {
    const { onClose, view } = setup();
    await view;
    await fireEvent.press(screen.getByRole("button", { name: "Close the map" }));
    await fireEvent(screen.getByTestId("location-picker"), "requestClose");
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("does nothing more once closed while still finding the phone", async () => {
    let answer: (v: typeof granted) => void = () => {};
    loc.requestForegroundPermissionsAsync.mockReturnValue(new Promise((r) => (answer = r)));
    const { onLocated, view } = setup();
    const { unmount } = await view;
    // fireEvent resolves once the handler's promise does, so this press stays open
    const pressing = fireEvent.press(screen.getByRole("button", { name: "Locate me" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Finding you…" })).toBeBusy());
    await unmount();
    answer(granted);
    await pressing;
    expect(onLocated).not.toHaveBeenCalled();
  });

  it("does nothing more once closed while confirming", async () => {
    let answer: (v: Location.LocationGeocodedAddress[]) => void = () => {};
    loc.reverseGeocodeAsync.mockReturnValue(new Promise((r) => (answer = r)));
    const { onConfirm, view } = setup();
    const { unmount } = await view;
    const pressing = fireEvent.press(screen.getByRole("button", { name: "Confirm this location" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Finding the address…" })).toBeBusy());
    await unmount();
    answer([kamlaNagar as Location.LocationGeocodedAddress]);
    await pressing;
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("names every control, keeps them 44pt and up, and its text readable", async () => {
    await setup().view;
    await screen.findByText("12 Nehru Road, Kamla Nagar, Agra");
    const root = screen.container as TestInstance;
    const nodes = reachable(root);
    expect([...controlAndImageFindings(nodes), ...targetFindings(nodes), ...contrastFindings(root, colors.canvas)]).toEqual([]);
  });
});
