import { describe, expect, it } from "vitest";
import { ADDRESS_FIELDS, DETAILS_EDITABLE_STAGES, detailsEditable, detailSteps, JOB_FIELDS, stepsProgress } from "@/lib/projects/details";
import { projectDetailsSchema } from "@/lib/projects/inputs";
import { PROJECT_STAGES } from "@/lib/projects/stages";

describe("the steps to complete after booking", () => {
  it("are the address, then the job, each done once it has what the inspector needs", () => {
    const none = detailSteps({ address: null, pincode: null, service: null });
    expect(none.map((s) => [s.key, s.done])).toEqual([["address", false], ["job", false]]);
    expect(stepsProgress(none)).toEqual({ done: 0, total: 2, label: "0 of 2 done" });
    // an address needs its PIN code too
    expect(detailSteps({ address: "12 Rose Villa", pincode: null, service: null })[0].done).toBe(false);
    const both = detailSteps({ address: "12 Rose Villa", pincode: "282005", service: "Interior Painting" });
    expect(both.every((s) => s.done)).toBe(true);
    expect(stepsProgress(both).label).toBe("2 of 2 done");
    expect(new Set([...ADDRESS_FIELDS, ...JOB_FIELDS]).size).toBe(ADDRESS_FIELDS.length + JOB_FIELDS.length);
  });

  it("can be changed until the inspector visits, and not after", () => {
    expect(DETAILS_EDITABLE_STAGES).toEqual(["booked", "call_confirmed", "inspection_scheduled"]);
    expect(PROJECT_STAGES.filter(detailsEditable)).toEqual([...DETAILS_EDITABLE_STAGES]);
    for (const stage of ["inspected", "quotation_shared", "completed", "on_hold", "cancelled"] as const) expect(detailsEditable(stage)).toBe(false);
  });
});

describe("projectDetailsSchema", () => {
  const ok = (body: unknown) => projectDetailsSchema.parse(body);
  const fails = (body: unknown) => Object.keys(projectDetailsSchema.safeParse(body).error?.flatten().fieldErrors ?? {});

  it("takes any of the fields, trimmed, and leaves out the ones not sent", () => {
    expect(ok({})).toEqual({});
    expect(ok({ address: " 12 Rose Villa ", pincode: "282 005", locality: " Dayalbagh " })).toEqual({ address: "12 Rose Villa", pincode: "282005", locality: "Dayalbagh" });
    expect(ok({ carpetArea: "1,200", floors: "4+", location: { lat: 27.2, lng: 78 } })).toEqual({ carpetArea: 1200, floors: "4+", location: { lat: 27.2, lng: 78 } });
  });

  it("clears an optional field sent blank or null, but never the area", () => {
    expect(ok({ address: "", pincode: "", service: "", notes: "  ", carpetArea: "", preferredDate: "", location: null })).toEqual({ address: null, pincode: null, service: null, notes: null, carpetArea: null, preferredDate: null, location: null });
    expect(fails({ locality: "" })).toEqual(["locality"]);
  });

  it("refuses bad values and unknown fields", () => {
    expect(fails({ pincode: "02800", address: "12", service: "Car wrap", floors: "9", carpetArea: 50, preferredDate: "31-12-2026" }).sort()).toEqual(["address", "carpetArea", "floors", "pincode", "preferredDate", "service"]);
    expect(projectDetailsSchema.safeParse({ stage: "completed" }).success).toBe(false);
    expect(projectDetailsSchema.safeParse({ location: { lat: 1, lng: 2, alt: 3 } }).success).toBe(false);
    expect(fails({ preferredDate: "2999-01-01" })).toEqual(["preferredDate"]);
  });
});
