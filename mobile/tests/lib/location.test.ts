import * as Location from "expo-location";

import { toBookingPayload, emptyBooking } from "~/lib/booking";
import {
  centreOf,
  CITY_DELTA,
  cityRegion,
  fillFromPlace,
  INDIA,
  locate,
  LOCATE_TIMEOUT_MS,
  locateProblem,
  lookUpPlace,
  matchArea,
  matchLiveCity,
  NOT_LISTED_NOTE,
  opensSettings,
  regionAt,
  roundCoord,
  roundLatLng,
  STREET_DELTA,
  streetLine,
  TimeoutError,
  withTimeout,
  type Place,
} from "~/lib/location";
import { generalFaqs, liveCities, site } from "~/shared";

const loc = jest.mocked(Location);
const live = liveCities();
const [agra, mathura, vrindavan] = live;

const position = (lat: number, lng: number) => ({ coords: { latitude: lat, longitude: lng, altitude: null, accuracy: 5, altitudeAccuracy: null, heading: null, speed: null }, timestamp: 0 });
const granted = { status: "granted", granted: true, canAskAgain: true, expires: "never" } as Awaited<ReturnType<typeof Location.requestForegroundPermissionsAsync>>;
const denied = { ...granted, status: "denied", granted: false } as typeof granted;

/** A place in Agra as the iOS geocoder gives it. */
const kamlaNagar: Place = { name: "12 Nehru Road", streetNumber: "12", street: "Nehru Road", district: "Kamla Nagar", city: "Agra", subregion: "Agra", region: "Uttar Pradesh", postalCode: "282005" };

beforeEach(() => {
  jest.clearAllMocks();
  loc.requestForegroundPermissionsAsync.mockResolvedValue(granted);
  loc.hasServicesEnabledAsync.mockResolvedValue(true);
  loc.getCurrentPositionAsync.mockResolvedValue(position(27.2046, 78.0042));
  loc.getLastKnownPositionAsync.mockResolvedValue(null);
});

describe("coordinates and regions", () => {
  it("round to 6 decimals", () => {
    expect(roundCoord(27.17671234567)).toBe(27.176712);
    expect(roundLatLng({ lat: 27.1767129, lng: 78.0080745 })).toEqual({ lat: 27.176713, lng: 78.008075 });
  });

  it("frame a spot at street level by default, and read a region's centre back", () => {
    expect(regionAt({ lat: 27.2, lng: 78 })).toEqual({ latitude: 27.2, longitude: 78, latitudeDelta: STREET_DELTA, longitudeDelta: STREET_DELTA });
    expect(regionAt({ lat: 27.2, lng: 78 }, CITY_DELTA).latitudeDelta).toBe(CITY_DELTA);
    expect(centreOf({ latitude: 27.2, longitude: 78 })).toEqual({ lat: 27.2, lng: 78 });
  });
});

describe("matching a place to the form", () => {
  it("finds the live city by the place's city, then its subregion, then its district, ignoring case and punctuation", () => {
    expect(matchLiveCity({ city: "agra" }, live)).toBe(agra);
    expect(matchLiveCity({ city: "Vrindavan", subregion: "Mathura" }, live)).toBe(vrindavan);
    expect(matchLiveCity({ city: "Chhata", subregion: "Mathura" }, live)).toBe(mathura);
    expect(matchLiveCity({ city: null, subregion: null, district: "Mathura." }, live)).toBe(mathura);
    expect(matchLiveCity({ city: "Lucknow", subregion: "Lucknow" }, live)).toBeUndefined();
    expect(matchLiveCity({}, live)).toBeUndefined();
  });

  it("spells a locality as the city's list does, also when the place names more around it", () => {
    expect(matchArea(agra.areas, agra.areas[0].toUpperCase())).toBe(agra.areas[0]);
    expect(matchArea(["Kamla Nagar", "Dayalbagh"], "Kamla Nagar Colony")).toBe("Kamla Nagar");
    expect(matchArea(["Kamla Nagar"], "Nagar")).toBeUndefined();
    expect(matchArea(["Kamla Nagar"], " ")).toBeUndefined();
  });

  it("builds the street line from the name and street without repeats, plus codes or area names", () => {
    expect(streetLine(kamlaNagar)).toBe("12 Nehru Road");
    // Android: the feature name is the house number; the longer street line takes its place
    expect(streetLine({ name: "12", streetNumber: "12", street: "Nehru Road" })).toBe("12 Nehru Road");
    expect(streetLine({ name: "Rose Villa", street: "Nehru Road" })).toBe("Rose Villa, Nehru Road");
    expect(streetLine({ name: "6RX8+2C", district: "Dayalbagh" })).toBe("");
    expect(streetLine({ name: "Dayalbagh", district: "Dayalbagh", city: "Agra" })).toBe("");
    expect(streetLine({ name: "282005", postalCode: "282005" })).toBe("");
    expect(streetLine({ name: "x".repeat(300) })).toHaveLength(200);
  });

  it("fills the address, the locality, the PIN code and the live city from a place", () => {
    expect(fillFromPlace(kamlaNagar, live)).toEqual({ address: "12 Nehru Road", locality: "Kamla Nagar", pincode: "282005", city: agra, short: "12 Nehru Road, Kamla Nagar, Agra" });
  });

  it("leaves out what the place does not have, and a PIN code that is not 6 digits", () => {
    const fill = fillFromPlace({ district: "Agra", city: "Agra", postalCode: "2820" }, live);
    expect(fill).toEqual({ address: "", locality: "", pincode: "", city: agra, short: "Agra" });
  });

  it("takes a locality from the place's name when it is one of the chosen city's, without repeating it in the address", () => {
    const fill = fillFromPlace({ name: "dayalbagh", city: "Unknown Town", postalCode: "282 005" }, live, agra);
    expect(fill.locality).toBe("Dayalbagh");
    expect(fill.address).toBe("");
    expect(fill.pincode).toBe("282005");
    expect(fill.city).toBeUndefined();
    expect(fill.short).toBe("Dayalbagh, Unknown Town");
  });

  it("names a city we do not paint in without matching it", () => {
    const fill = fillFromPlace({ name: "MG Road", district: "Hazratganj", city: "Lucknow", postalCode: "226001" }, live);
    expect(fill.city).toBeUndefined();
    expect(fill.short).toBe("MG Road, Hazratganj, Lucknow");
  });

  it("uses the site's own words for an area outside our list (the painters-near-me FAQ)", () => {
    expect(generalFaqs.some((f) => f.a.includes(NOT_LISTED_NOTE))).toBe(true);
  });
});

describe("messages", () => {
  it("say what still works, on the form and on the map, with Settings only for a refused permission", () => {
    expect(locateProblem("denied", "form")).toBe(`Location is off for ${site.name}. Type your address below, or turn location on in Settings.`);
    expect(locateProblem("denied", "map")).toBe(`Location is off for ${site.name}. Move the map to your home, or turn location on in Settings.`);
    expect(locateProblem("services-off", "form")).toMatch(/^Location services are off on this phone\. Type your address below/);
    expect(locateProblem("timeout", "form")).toBe("We could not find your location in time. Type your address below, or pick it on the map.");
    expect(locateProblem("unavailable", "map")).toBe("We could not get your location. Move the map to your home, or try Locate me again.");
    expect(opensSettings("denied")).toBe(true);
    for (const p of ["services-off", "timeout", "unavailable"] as const) expect(opensSettings(p)).toBe(false);
  });
});

describe("withTimeout", () => {
  afterEach(() => jest.useRealTimers());

  it("passes an answer or an error through, and gives up after the time", async () => {
    await expect(withTimeout(Promise.resolve(1), 100)).resolves.toBe(1);
    await expect(withTimeout(Promise.reject(new Error("no")), 100)).rejects.toThrow("no");
    jest.useFakeTimers();
    const slow = withTimeout(new Promise(() => {}), 100);
    jest.advanceTimersByTime(100);
    await expect(slow).rejects.toBeInstanceOf(TimeoutError);
  });
});

describe("locate", () => {
  afterEach(() => jest.useRealTimers());

  it("asks for permission, then gives the phone's position from an accurate fix", async () => {
    await expect(locate()).resolves.toEqual({ ok: true, coords: { lat: 27.2046, lng: 78.0042 } });
    expect(loc.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(loc.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: Location.Accuracy.High });
  });

  it("reports a refused permission without trying for a fix", async () => {
    loc.requestForegroundPermissionsAsync.mockResolvedValue(denied);
    await expect(locate()).resolves.toEqual({ ok: false, problem: "denied" });
    expect(loc.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it("reports a permission request that fails as unavailable", async () => {
    loc.requestForegroundPermissionsAsync.mockRejectedValue(new Error("no plist"));
    await expect(locate()).resolves.toEqual({ ok: false, problem: "unavailable" });
  });

  it("reports location services turned off", async () => {
    loc.hasServicesEnabledAsync.mockResolvedValue(false);
    await expect(locate()).resolves.toEqual({ ok: false, problem: "services-off" });
  });

  it("goes on when the services check itself fails", async () => {
    loc.hasServicesEnabledAsync.mockRejectedValue(new Error("?"));
    await expect(locate()).resolves.toMatchObject({ ok: true });
  });

  it("falls back to a recent position when the fix fails, else reports why", async () => {
    loc.getCurrentPositionAsync.mockRejectedValue(new Error("no fix"));
    loc.getLastKnownPositionAsync.mockResolvedValueOnce(position(27.1, 78.1));
    await expect(locate()).resolves.toEqual({ ok: true, coords: { lat: 27.1, lng: 78.1 } });
    await expect(locate()).resolves.toEqual({ ok: false, problem: "unavailable" });
    loc.getLastKnownPositionAsync.mockRejectedValue(new Error("none"));
    await expect(locate()).resolves.toEqual({ ok: false, problem: "unavailable" });
  });

  it("gives up on a fix that takes too long", async () => {
    jest.useFakeTimers();
    loc.getCurrentPositionAsync.mockReturnValue(new Promise(() => {}));
    const result = locate();
    await jest.advanceTimersByTimeAsync(LOCATE_TIMEOUT_MS);
    await expect(result).resolves.toEqual({ ok: false, problem: "timeout" });
  });
});

describe("cityRegion", () => {
  it("opens over the city the geocoder finds", async () => {
    loc.geocodeAsync.mockResolvedValue([{ latitude: 27.18, longitude: 78.01 }]);
    await expect(cityRegion("Agra")).resolves.toEqual(regionAt({ lat: 27.18, lng: 78.01 }, CITY_DELTA));
    expect(loc.geocodeAsync).toHaveBeenCalledWith("Agra, India");
  });

  it("opens over India when the city cannot be found, or there is none", async () => {
    loc.geocodeAsync.mockResolvedValue([]);
    await expect(cityRegion("Agra")).resolves.toBe(INDIA);
    loc.geocodeAsync.mockRejectedValue(new Error("offline"));
    await expect(cityRegion("Agra")).resolves.toBe(INDIA);
    await expect(cityRegion(undefined)).resolves.toBe(INDIA);
  });
});

describe("lookUpPlace", () => {
  it("gives the first address under a spot, or null when there is none or the lookup fails", async () => {
    loc.reverseGeocodeAsync.mockResolvedValue([kamlaNagar as Location.LocationGeocodedAddress]);
    await expect(lookUpPlace({ lat: 27.2, lng: 78 })).resolves.toBe(kamlaNagar);
    expect(loc.reverseGeocodeAsync).toHaveBeenCalledWith({ latitude: 27.2, longitude: 78 });
    loc.reverseGeocodeAsync.mockResolvedValue([]);
    await expect(lookUpPlace({ lat: 27.2, lng: 78 })).resolves.toBeNull();
    loc.reverseGeocodeAsync.mockRejectedValue(new Error("rate limited"));
    await expect(lookUpPlace({ lat: 27.2, lng: 78 })).resolves.toBeNull();
  });
});

describe("the booking payload's location", () => {
  const values = emptyBooking({ name: "Asha", phone: "9876543210", address: "12 Nehru Road", locality: "Kamla Nagar", pincode: "282005", city: "agra" });

  it("is sent to 6 decimals when the visitor pinned the spot", () => {
    expect(toBookingPayload(values, live, { lat: 27.20461234, lng: 78.00419876 }).location).toEqual({ lat: 27.204612, lng: 78.004199 });
  });

  it("is left out when nothing was pinned", () => {
    expect("location" in toBookingPayload(values)).toBe(false);
  });
});
