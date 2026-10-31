import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LeadsTable, statusKey } from "@/components/admin/LeadsTable";
import { LEAD_COLUMNS, type LeadRecord } from "@/lib/leads/record";

// The leads table's follow-up status control (saved at once through PATCH /api/admin/leads/{id})
// and the link from each booking to its project.

const lead = (over: Partial<LeadRecord>): LeadRecord => ({ ...Object.fromEntries(LEAD_COLUMNS.map((c) => [c, ""])), Status: "New", ...over }) as LeadRecord;
const LEAD = "22222222-2222-4222-8222-222222222222";
const PROJECT = "33333333-3333-4333-8333-333333333333";

const leads = [
  lead({ "Lead ID": LEAD, Name: "Asha Verma", Phone: "9876543210", Type: "booking", "Project ID": PROJECT }),
  lead({ "Lead ID": "L2", Name: "Ravi", Phone: "9123456789", Type: "contact", Message: "Shop repaint", Status: "Called" }),
];

const answer = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("LeadsTable: status and project", () => {
  it("maps the table's labels back to the stored statuses", () => {
    expect(statusKey("New")).toBe("new");
    expect(statusKey("Not interested")).toBe("not_interested");
    expect(statusKey("Follow up Friday")).toBe("");
  });

  it("links each booking to its project, and nothing for a message", () => {
    render(<LeadsTable leads={leads} />);
    expect(screen.getByRole("columnheader", { name: "Project" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open project for Asha Verma" })).toHaveAttribute("href", `/admin/projects/${PROJECT}`);
    expect(screen.getAllByRole("link", { name: /Open project/ })).toHaveLength(1);
  });

  it("saves a new status at once, and the counts and filters follow it", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(answer(200, { apiVersion: "v1", kind: "lead", data: { id: LEAD, status: "converted", statusLabel: "Converted" } }));
    render(<LeadsTable leads={leads} />);
    const card = screen.getByText("Status: New", { selector: "p" }).parentElement!;
    expect(within(card).getByText("1")).toBeInTheDocument();
    const select = screen.getByLabelText("Status of Asha Verma");
    expect(select).toHaveValue("new");

    await userEvent.setup().selectOptions(select, "converted");
    await waitFor(() => expect(select).not.toBeDisabled());
    expect(select).toHaveValue("converted");
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(`/api/admin/leads/${LEAD}`);
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({ status: "converted" });
    expect(within(card).getByText("0")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Status")).getByRole("option", { name: "Converted" })).toBeInTheDocument();
  });

  it("goes back to the saved status and says why when the save fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(answer(404, { apiVersion: "v1", kind: "error", error: { code: "not_found", message: "No such lead." } }));
    render(<LeadsTable leads={leads} />);
    const select = screen.getByLabelText("Status of Ravi");
    expect(select).toHaveValue("called");
    const user = userEvent.setup();
    await user.selectOptions(select, "spam");
    expect(await screen.findByRole("alert")).toHaveTextContent("Not saved: No such lead.");
    expect(select).toHaveValue("called");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(answer(401, { apiVersion: "v1", kind: "error", error: { code: "unauthenticated", message: "Your admin session has ended." } }));
    await user.selectOptions(select, "spam");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Not saved: Session ended: sign in again."));
  });

  it("keeps a status from outside the list visible, as a choice that cannot be picked again", () => {
    render(<LeadsTable leads={[lead({ "Lead ID": "L9", Name: "Kiran", Status: "Follow up Friday" })]} />);
    const select = screen.getByLabelText("Status of Kiran");
    expect(select).toHaveValue("Follow up Friday");
    expect(within(select).getByRole("option", { name: "Follow up Friday" })).toBeDisabled();
  });
});
