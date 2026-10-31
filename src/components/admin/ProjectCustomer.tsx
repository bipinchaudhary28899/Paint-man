import type { ReactNode } from "react";
import { formatIstDateTime } from "@/lib/admin/ist";
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

/** The customer, the address (with the map pin when the app booking dropped one) and what the booking said about the job. */
export function ProjectCustomer({ project }: { project: AdminProject }) {
  const { lead } = project;
  const place = [project.address, project.locality, [project.city, project.pincode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const size = lead ? [lead.floors ? `${lead.floors} floor${lead.floors === "1" ? "" : "s"}` : "", lead.homeSize ?? "", lead.carpetArea ? `${lead.carpetArea.toLocaleString("en-IN")} sq ft/floor` : ""].filter(Boolean).join(" · ") : "";

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
        <Row label="Address">{place || "—"}</Row>
        {lead?.location && (
          <Row label="Map pin">
            <a href={mapLink(lead.location)} target="_blank" rel="noopener noreferrer" className="font-semibold text-tangerine-text underline">
              Open in Google Maps
            </a>
          </Row>
        )}
        <Row label="Account">{project.userId ? "Signed in: sees this project on their tracker" : "Not signed in yet (sees it once they log in with this number)"}</Row>
        <Row label="Service">{project.service ?? "—"}</Row>
        {lead && (
          <>
            {lead.propertyType && <Row label="Property">{lead.propertyType}</Row>}
            {size && <Row label="Job size">{size}</Row>}
            {lead.estPaintArea !== null && <Row label="Est. paint area">≈ {lead.estPaintArea.toLocaleString("en-IN")} sq ft</Row>}
            {lead.preferredDate && <Row label="Preferred visit">{formatDay(lead.preferredDate)}</Row>}
            {lead.message && <Row label="Message">{lead.message}</Row>}
            <Row label="Booked">
              {formatIstDateTime(lead.createdAt)} · {lead.source === "app" ? "App" : "Website"}
            </Row>
          </>
        )}
      </dl>
    </section>
  );
}
