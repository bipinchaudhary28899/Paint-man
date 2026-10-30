import { FIELD_MESSAGES, requiredFieldErrors } from "@/lib/leads/field-checks";
import {
  BOOKINGS_ARE_SENT,
  bookingRequiredFields,
  carpetAreaProblem,
  emptyBooking,
  FORM_ERROR,
  jobEstimate,
  submitBooking,
  toBookingPayload,
  validateBooking,
} from "~/lib/booking";
import { liveCities } from "~/shared";

const live = liveCities();
const [agra] = live;

const complete = emptyBooking({
  name: "Asha Verma",
  phone: "+91 98765-43210",
  address: "12, Rose Villa, Nehru Road",
  city: agra.slug,
  locality: "Kamla Nagar",
  pincode: "282 005",
});

describe("required fields", () => {
  it("are the website's booking fields, with the city before the locality when several cities are live", () => {
    expect(live.length).toBeGreaterThan(1);
    expect(bookingRequiredFields(live)).toEqual(["name", "phone", "address", "city", "locality", "pincode"]);
    expect(bookingRequiredFields([agra])).toEqual(["name", "phone", "address", "locality", "pincode"]);
  });

  it("use the website's own messages", () => {
    expect(validateBooking(emptyBooking(), live)).toEqual({
      name: FIELD_MESSAGES.name,
      phone: FIELD_MESSAGES.phone,
      address: FIELD_MESSAGES.address,
      city: FIELD_MESSAGES.city,
      locality: FIELD_MESSAGES.locality,
      pincode: FIELD_MESSAGES.pincode,
    });
    // the same answer the site's shared check gives
    expect(validateBooking(emptyBooking(), live)).toEqual(requiredFieldErrors("booking", emptyBooking(), bookingRequiredFields(live)));
  });

  it("accept a complete booking with a +91 number and a spaced PIN", () => {
    expect(validateBooking(complete, live)).toEqual({});
  });
});

describe("carpet area", () => {
  it("is optional, and when given a whole number of sq ft from 100 to 20,000", () => {
    expect(carpetAreaProblem("")).toBeUndefined();
    expect(carpetAreaProblem("1,200")).toBeUndefined();
    expect(carpetAreaProblem("12.5")).toBe("Enter a whole number of sq ft");
    expect(carpetAreaProblem("50")).toBe("Enter the carpet area in sq ft (100–20,000), or leave it blank");
    expect(carpetAreaProblem("25000")).toMatch(/^Enter the carpet area/);
    expect(carpetAreaProblem("big")).toMatch(/^Enter the carpet area/);
    expect(validateBooking({ ...complete, carpetArea: "50" }, live)).toEqual({ carpetArea: carpetAreaProblem("50") });
  });

  it("gives the live job estimate, as the website's form does", () => {
    expect(jobEstimate({ carpetArea: "", floors: "", service: "" })).toEqual({ area: null, hasCarpet: false, measuredOnSite: false });
    const est = jobEstimate({ carpetArea: "1000", floors: "2", service: "Interior Painting" });
    expect(est.hasCarpet).toBe(true);
    expect(est.area).toBeGreaterThan(1000);
    expect(jobEstimate({ carpetArea: "1000", floors: "", service: "Doors, Windows & Small Jobs" })).toEqual({ area: null, hasCarpet: true, measuredOnSite: true });
  });
});

describe("toBookingPayload", () => {
  it("cleans values the way the server schema does and leaves blank answers out", () => {
    expect(toBookingPayload({ ...complete, carpetArea: "1,200", service: "Interior Painting", message: "  " }, live)).toEqual({
      type: "booking",
      name: "Asha Verma",
      phone: "9876543210",
      address: "12, Rose Villa, Nehru Road",
      locality: "Kamla Nagar",
      pincode: "282005",
      city: "agra",
      service: "Interior Painting",
      propertyType: undefined,
      floors: undefined,
      homeSize: undefined,
      carpetArea: 1200,
      preferredDate: undefined,
      message: undefined,
      page: "app",
    });
  });

  it("books the only live city when there is one", () => {
    expect(toBookingPayload({ ...complete, city: "" }, [agra]).city).toBe("agra");
  });
});

describe("submitBooking (stubbed)", () => {
  it("sends nothing: a complete booking is checked and reported as not sent", async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock;
    expect(BOOKINGS_ARE_SENT).toBe(false);
    await expect(submitBooking(complete, live)).resolves.toEqual({ ok: true, sent: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the field errors and the form line", async () => {
    await expect(submitBooking({ ...complete, pincode: "12" }, live)).resolves.toEqual({ ok: false, errors: { pincode: FIELD_MESSAGES.pincode }, message: FORM_ERROR });
  });
});
