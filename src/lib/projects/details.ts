// What the customer adds to their project in their account after booking: the booking itself asks
// only who and where (name, mobile, city and area). Two steps, shown on the project page (website
// and app) until the inspection: the address the inspector visits, then the job (what to paint, the
// property, its size, a preferred date for the visit, a note). Plain data and pure functions, so
// client components and the app use it too; the API validates with projectDetailsSchema (inputs.ts).

import type { ProjectStage } from "./stages";

/** Until the inspector has visited, the customer can add or correct these; after it, the team has measured on site. */
export const DETAILS_EDITABLE_STAGES = ["booked", "call_confirmed", "inspection_scheduled"] as const satisfies readonly ProjectStage[];

export const detailsEditable = (stage: ProjectStage) => (DETAILS_EDITABLE_STAGES as readonly string[]).includes(stage);

/** The fields of the two steps, as the project API names them. */
export const ADDRESS_FIELDS = ["address", "locality", "pincode"] as const;
export const JOB_FIELDS = ["service", "propertyType", "floors", "homeSize", "carpetArea", "preferredDate", "notes"] as const;

export type ProjectDetailsFields = {
  address: string | null;
  locality: string | null;
  pincode: string | null;
  service: string | null;
  propertyType: string | null;
  floors: string | null;
  homeSize: string | null;
  carpetArea: number | null;
  preferredDate: string | null;
  notes: string | null;
};

export type DetailStepKey = "address" | "job";
export type DetailStep = { key: DetailStepKey; title: string; text: string; done: boolean };

/**
 * The steps to complete, in order. The address is done with a house or flat and street and a PIN
 * code; the job once it says what needs painting (the rest of it is optional).
 */
export function detailSteps(p: Pick<ProjectDetailsFields, "address" | "pincode" | "service">): DetailStep[] {
  return [
    { key: "address", title: "Add your address", text: "The house or flat and street, and the PIN code, so the inspector finds you.", done: Boolean(p.address && p.pincode) },
    { key: "job", title: "Tell us about the job", text: "What needs painting, and if you like the property, its size and a good day for the visit.", done: Boolean(p.service) },
  ];
}

/** "1 of 2 done" */
export function stepsProgress(steps: DetailStep[]): { done: number; total: number; label: string } {
  const done = steps.filter((s) => s.done).length;
  return { done, total: steps.length, label: `${done} of ${steps.length} done` };
}
