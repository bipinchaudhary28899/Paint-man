import {
  Accuracy,
  geocodeAsync,
  getCurrentPositionAsync,
  getLastKnownPositionAsync,
  hasServicesEnabledAsync,
  requestForegroundPermissionsAsync,
  reverseGeocodeAsync,
  type LocationGeocodedAddress,
  type LocationObject,
} from "expo-location";

import { site, type City } from "~/shared";

// The booking form's location picker without the screen: finding the phone (permission is asked only
// when the visitor taps "Use my current location" or "Locate me"), finding a city on the map, looking
// up the address under the pin, and turning that address into the form's fields. The position is used
// only to fill the address and stays in the form: nothing here logs or stores it.

export type LatLng = { lat: number; lng: number };

/** What the map shows: a centre and how many degrees of latitude and longitude are in view (react-native-maps' Region). */
export type MapRegion = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };

/** The parts of a geocoded address the form uses. */
export type Place = Partial<Pick<LocationGeocodedAddress, "name" | "streetNumber" | "street" | "district" | "city" | "subregion" | "region" | "postalCode">>;

/** About 400 m across: close enough to tell one house from the next. */
export const STREET_DELTA = 0.004;
/** A whole city in view (the map opened without GPS). */
export const CITY_DELTA = 0.08;
/** All of India in view: where the map opens when no city could be found. */
export const INDIA: MapRegion = { latitude: 22.6, longitude: 79.0, latitudeDelta: 28, longitudeDelta: 28 };

/** How long to wait for a GPS fix before giving up (a fix indoors can take a while). */
export const LOCATE_TIMEOUT_MS = 12_000;
/** How long to wait for the geocoder (it needs the network). */
export const GEOCODE_TIMEOUT_MS = 8_000;
/** A recent position the phone already had stands in when a fresh fix is slow. */
const LAST_KNOWN_MAX_AGE_MS = 5 * 60_000;

/** The form's own length caps for the address and the locality. */
const ADDRESS_MAX = 200;
const LOCALITY_MAX = 80;

/** Coordinates to 6 decimals (about 10 cm), as the booking sends them. */
export const roundCoord = (n: number) => Number(n.toFixed(6));
export const roundLatLng = ({ lat, lng }: LatLng): LatLng => ({ lat: roundCoord(lat), lng: roundCoord(lng) });

export const regionAt = ({ lat, lng }: LatLng, delta = STREET_DELTA): MapRegion => ({ latitude: lat, longitude: lng, latitudeDelta: delta, longitudeDelta: delta });
export const centreOf = (r: { latitude: number; longitude: number }): LatLng => ({ lat: r.latitude, lng: r.longitude });

const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
/** Lower case with punctuation as spaces, to compare place names ("Dayal Bagh." and "dayal bagh"). */
const norm = (s: string) => s.toLowerCase().replace(/[\s.,'’()\-/]+/g, " ").trim();
const same = (a: string, b: string) => norm(a) !== "" && norm(a) === norm(b);
/** A Google plus code ("6RX8+2C Agra"), which the geocoder gives where a place has no street address. */
const isPlusCode = (s: string) => /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}\b/i.test(s);

/** The live city a place is in: its city, else its subregion (district), else its district, by name. */
export function matchLiveCity(place: Place, live: readonly City[]): City | undefined {
  for (const name of [place.city, place.subregion, place.district]) {
    const city = live.find((c) => same(c.name, clean(name)));
    if (city) return city;
  }
  return undefined;
}

/** One of a city's localities, spelled as the form spells it: the same name, or a locality named inside it ("Kamla Nagar Colony"). */
export function matchArea(areas: readonly string[], name: string): string | undefined {
  const n = norm(name);
  if (n === "") return undefined;
  return areas.find((a) => norm(a) === n) ?? areas.find((a) => ` ${n} `.includes(` ${norm(a)} `));
}

/** The house, building and street from a place: its name and its street, without repeats, plus codes or the area's own names. */
export function streetLine(place: Place, alsoSkip: readonly string[] = []): string {
  const street = [clean(place.streetNumber), clean(place.street)].filter(Boolean).join(" ");
  const areaNames = [place.district, place.city, place.subregion, place.region, place.postalCode, ...alsoSkip].map(clean);
  const parts: string[] = [];
  for (const part of [clean(place.name), street]) {
    if (part === "" || isPlusCode(part) || areaNames.some((a) => same(a, part))) continue;
    if (parts.some((p) => norm(p).includes(norm(part)))) continue;
    // a longer part takes the place of one it contains ("12 Nehru Road" over "12")
    const shorter = parts.findIndex((p) => norm(part).includes(norm(p)));
    if (shorter >= 0) parts[shorter] = part;
    else parts.push(part);
  }
  return parts.join(", ").slice(0, ADDRESS_MAX);
}

export type AddressFill = {
  /** house / flat, building and street ("" when the place has none) */
  address: string;
  locality: string;
  /** 6 digits, or "" */
  pincode: string;
  /** the live city the place is in, if any */
  city?: City;
  /** the address in one short line, for the "Pinned on the map" row */
  short: string;
};

/**
 * The form's address fields from a geocoded place. The locality is the place's district (its
 * sublocality), spelled as one of the city's localities when it is one so its pill lights up; the
 * city is a live city only when the place's city, subregion or district names one.
 */
export function fillFromPlace(place: Place, live: readonly City[], chosen?: City): AddressFill {
  const city = matchLiveCity(place, live);
  const areas = (city ?? chosen)?.areas ?? [];
  const cityName = city?.name ?? (clean(place.city) || clean(place.subregion));
  const district = clean(place.district);
  const rawLocality = district !== "" && !same(district, cityName) ? district : "";
  const locality = ((rawLocality && matchArea(areas, rawLocality)) || rawLocality || matchArea(areas, clean(place.name)) || "").slice(0, LOCALITY_MAX);
  const pin = clean(place.postalCode).replace(/\s/g, "");
  const address = streetLine(place, [locality]);
  const short = [address, locality, cityName].filter((p, i, all) => p !== "" && !all.slice(0, i).some((q) => same(q, p))).join(", ");
  return { address, locality, pincode: /^\d{6}$/.test(pin) ? pin : "", city, short };
}

/** The site's own words for a place outside the cities and localities we list (the "painters near me" FAQ). */
export const NOT_LISTED_NOTE = "If your area is not listed, book anyway and we will confirm whether we can serve you.";

/** Why the phone's position could not be had. */
export type LocateProblem = "denied" | "services-off" | "timeout" | "unavailable";

/**
 * A calm line for a position that could not be had, pointing to what still works: typing the address
 * (on the form) or moving the map (in the picker). Manual entry is never blocked.
 */
export function locateProblem(problem: LocateProblem, where: "form" | "map"): string {
  const instead = where === "form" ? "Type your address below" : "Move the map to your home";
  const or = where === "form" ? "pick it on the map" : "try Locate me again";
  switch (problem) {
    case "denied":
      return `Location is off for ${site.name}. ${instead}, or turn location on in Settings.`;
    case "services-off":
      return `Location services are off on this phone. ${instead}, or turn them on in your phone's settings.`;
    case "timeout":
      return `We could not find your location in time. ${instead}, or ${or}.`;
    case "unavailable":
      return `We could not get your location. ${instead}, or ${or}.`;
  }
}

/** Only a refused permission is fixed in the app's own settings page ("Open Settings"). */
export const opensSettings = (problem: LocateProblem) => problem === "denied";

/** Shown in the picker when the address under the pin cannot be looked up. */
export const LOOKUP_FAILED = "We could not look up the address here. You can still confirm the pin and type your address on the form.";

export class TimeoutError extends Error {
  constructor() {
    super("timed out");
  }
}

/** The promise's answer, or a TimeoutError after `ms`. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export type Located = { ok: true; coords: LatLng } | { ok: false; problem: LocateProblem };

const coordsOf = (p: LocationObject): LatLng => ({ lat: p.coords.latitude, lng: p.coords.longitude });

/**
 * The phone's position, asking for permission first (when in use only). Called only from a tap. A
 * slow fix falls back to a position the phone had in the last few minutes; the visitor fine-tunes the
 * pin on the map either way.
 */
export async function locate(): Promise<Located> {
  let granted: boolean;
  try {
    granted = (await requestForegroundPermissionsAsync()).status === "granted";
  } catch {
    return { ok: false, problem: "unavailable" };
  }
  if (!granted) return { ok: false, problem: "denied" };
  if (!(await hasServicesEnabledAsync().catch(() => true))) return { ok: false, problem: "services-off" };
  try {
    return { ok: true, coords: coordsOf(await withTimeout(getCurrentPositionAsync({ accuracy: Accuracy.High }), LOCATE_TIMEOUT_MS)) };
  } catch (error) {
    const last = await getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS }).catch(() => null);
    if (last) return { ok: true, coords: coordsOf(last) };
    return { ok: false, problem: error instanceof TimeoutError ? "timeout" : "unavailable" };
  }
}

/** Where to open the map for a city: the city found by the geocoder, or all of India when it cannot be. */
export async function cityRegion(name: string | undefined): Promise<MapRegion> {
  if (!name) return INDIA;
  try {
    const [hit] = await withTimeout(geocodeAsync(`${name}, India`), GEOCODE_TIMEOUT_MS);
    if (hit) return regionAt({ lat: hit.latitude, lng: hit.longitude }, CITY_DELTA);
  } catch {
    // no network, no geocoder, or (on Android) no location permission yet: the country view still works
  }
  return INDIA;
}

/** The address under a spot, or null when there is none or it cannot be looked up. */
export async function lookUpPlace(at: LatLng): Promise<Place | null> {
  try {
    const [place] = await withTimeout(reverseGeocodeAsync({ latitude: at.lat, longitude: at.lng }), GEOCODE_TIMEOUT_MS);
    return place ?? null;
  } catch {
    return null;
  }
}
