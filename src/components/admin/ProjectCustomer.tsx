import type { ReactNode } from "react";
import { formatIstDateTime } from "@/lib/admin/ist";
import { estimatePaintArea } from "@/lib/leads/estimate";
import type { AdminProject } from "@/lib/projects/repo";
import { formatDay } from "@/lib/projects/stages";

/** A Google Maps link to the app booking's map pin. */
export const mapLink = (location: { lat: number; lng: number }) => `https://maps.google.com/?q=${location.lat},${location.lng}`;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 border-t border-line py-2 first:border-t-0">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

/**
 * The customer, the address (with the map pin when the app booking dropped one) and the job: what the
 * customer added in their account, else what the booking said (projects booked before the account steps).
 */
export function ProjectCustomer({ project }: { project: AdminProject }) {
  const { lead } = project;
  const place = [project.address, project.locality, [project.city, project.pincode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const job = {
    propertyType: project.propertyType ?? lead?.propertyType ?? null,
    floors: project.floors ?? lead?.floors ?? null,
    homeSize: project.homeSize ?? lead?.homeSize ?? null,
    carpetArea: project.carpetArea ?? lead?.carpetArea ?? null,
    preferredDate: project.preferredDate ?? lead?.preferredDate ?? null,
    notes: project.notes ?? lead?.message ?? null,
  };
  const size = [job.floors ? `${job.floors} floor${job.floors === "1" ? "" : "s"}` : "", job.homeSize ?? "", job.carpetArea ? `${job.carpetArea.toLocaleString("en-IN")} sq ft/floor` : ""].filter(Boolean).join(" · ");
  const paintArea = estimatePaintArea(job.carpetArea ?? undefined, job.floors ?? "1", project.service ?? "");

  return (
    <section aria-labelledby="customer-heading" className="card p-5">
      <h2 id="customer-heading" className="font-display text-xl font-normal">
        Customer
      </h2>
      <dl className="mt-3 text-sm">
        <Row label="Name">{project.name}</Row>
        <Row label="Phone">
          <a href={`tel:+91${project.phone.replace(/\D/g, "").slice(-10)}`} className="font-semibold text-tangerine-text underline">
            {project.phone}
          </a>
        </Row>
        <Row label="Address">{project.address ? place : `${place || "—"} (house and street not added yet: the customer adds them in their account, or ask on the call)`}</Row>
        {(project.location ?? lead?.location) && (
          <Row label="Map pin">
            <a href={mapLink((project.location ?? lead?.location)!)} target="_blank" rel="noopener noreferrer" className="font-semibold text-tangerine-text underline">
              Open in Google Maps
            </a>
          </Row>
        )}
        <Row label="Account">{project.userId ? "Signed in: sees this project on their tracker" : "Not signed in yet (sees it once they log in with this number)"}</Row>
        <Row label="Service">{project.service ?? "—"}</Row>
        {job.propertyType && <Row label="Property">{job.propertyType}</Row>}
        {size && <Row label="Job size">{size}</Row>}
        {paintArea !== null && <Row label="Est. paint area">≈ {paintArea.toLocaleString("en-IN")} sq ft</Row>}
        {job.preferredDate && <Row label="Preferred visit">{formatDay(job.preferredDate)}</Row>}
        {job.notes && <Row label="Notes">{job.notes}</Row>}
        {lead && (
          <>
            <Row label="Booked">
              {formatIstDateTime(lead.createdAt)} · {lead.source === "app" ? "App" : "Website"}
            </Row>
          </>
        )}
      </dl>
    </section>
  );
}
