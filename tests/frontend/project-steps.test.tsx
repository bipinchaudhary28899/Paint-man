import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectSteps } from "@/components/account/ProjectSteps";
import type { ProjectDetailsFields } from "@/lib/projects/details";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const ID = "3f1c9a2e-7b44-4d2a-9f0e-1a2b3c4d5e6f";
const blank: ProjectDetailsFields = { address: null, locality: "Kamla Nagar", pincode: null, service: null, propertyType: null, floors: null, homeSize: null, carpetArea: null, preferredDate: null, notes: null };
const answer = (data: Partial<ProjectDetailsFields>, status = 200) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(status === 200 ? { kind: "project", data: { ...blank, ...data } } : data), { status }));

beforeEach(() => {
  router.refresh.mockReset();
  vi.restoreAllMocks();
});

describe("Steps to complete", () => {
  it("lists the address and the job with the progress, and opens the first step not done", () => {
    render(<ProjectSteps projectId={ID} details={blank} />);
    const section = screen.getByRole("region", { name: "Steps to complete" });
    expect(within(section).getByText("0 of 2 done")).toBeInTheDocument();
    expect(within(section).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Add your address (to do)", "Tell us about the job (to do)"]);
    // the address form is open, with the booking's area filled in
    expect(screen.getByRole("form", { name: "Add your address" })).toBeInTheDocument();
    expect(screen.getByLabelText("Area / locality")).toHaveValue("Kamla Nagar");
    expect(screen.queryByRole("form", { name: "Tell us about the job" })).toBeNull();
    expect(screen.getByRole("button", { name: "Add the job details" })).toBeInTheDocument();
  });

  it("checks the address with the booking form's words before sending anything", async () => {
    const fetchSpy = answer({});
    render(<ProjectSteps projectId={ID} details={blank} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("PIN code"), "2820");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Enter your house or flat number and street")).toBeInTheDocument();
    expect(screen.getByText("Enter your 6-digit PIN code")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Please check the highlighted fields.");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("saves the address to the project API, moves on to the job, and refreshes the page", async () => {
    const fetchSpy = answer({ address: "12 Rose Villa, Nehru Road", pincode: "282005" });
    render(<ProjectSteps projectId={ID} details={blank} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/House \/ flat no/), "12 Rose Villa, Nehru Road");
    await user.type(screen.getByLabelText("PIN code"), "282005");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(`/api/v1/projects/${ID}`);
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({ address: "12 Rose Villa, Nehru Road", locality: "Kamla Nagar", pincode: "282005" });
    expect(screen.getByText("1 of 2 done")).toBeInTheDocument();
    expect(screen.getByText("12 Rose Villa, Nehru Road, Kamla Nagar, 282005")).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Tell us about the job" })).toBeInTheDocument();
  });

  it("asks what needs painting, sends the job, and shows the API's field messages", async () => {
    const done = { ...blank, address: "12 Rose Villa", pincode: "282005" };
    const fetchSpy = answer({ ok: false, error: { code: "invalid_request", message: "Please check the highlighted fields.", details: { carpetArea: "Enter a whole number of sq ft" } } } as never, 400);
    render(<ProjectSteps projectId={ID} details={done} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Choose what needs painting")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    await user.selectOptions(screen.getByLabelText("What needs painting?"), "Interior Painting");
    await user.selectOptions(screen.getByLabelText("Floors to paint (optional)"), "2");
    await user.type(screen.getByLabelText(/Carpet area/), "12.5");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Enter a whole number of sq ft")).toBeInTheDocument();
    expect(screen.getByLabelText(/Carpet area/)).toHaveAttribute("aria-invalid", "true");
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toMatchObject({ service: "Interior Painting", floors: "2", carpetArea: "12.5" });
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("shows what a done step has, with Edit and Cancel, and says so when everything is done", async () => {
    const all = { ...blank, address: "12 Rose Villa", pincode: "282005", service: "Interior Painting", homeSize: "2 BHK", preferredDate: "2026-12-01" };
    render(<ProjectSteps projectId={ID} details={all} />);
    expect(screen.getByText("2 of 2 done")).toBeInTheDocument();
    expect(screen.getByText(/All done/)).toBeInTheDocument();
    expect(screen.getByText("Interior Painting · 2 BHK · visit from 2026-12-01")).toBeInTheDocument();
    expect(screen.queryByRole("form")).toBeNull();
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("button", { name: "Edit" })[1]);
    expect(screen.getByLabelText("What needs painting?")).toHaveValue("Interior Painting");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("form")).toBeNull();
  });

  it("says so when the network fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    render(<ProjectSteps projectId={ID} details={{ ...blank, address: "12 Rose Villa", pincode: "282005" }} />);
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("What needs painting?"), "Exterior Painting");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Network error/);
  });
});

describe("on the project page", () => {
  it("comes first while the address and job can still be added, and is gone after the inspection", async () => {
    const { ProjectTracker } = await import("@/components/account/ProjectTracker");
    const { stageSteps } = await import("@/lib/projects/stages");
    const project = {
      id: ID, city: "Agra", citySlug: "agra", stage: "booked" as const, stageLabel: "Booking received", currency: "INR" as const,
      ...blank, location: null, detailsEditable: true, stageExplanation: "We call you during working hours.", workStartsOn: null,
      createdAt: "2026-10-31T06:00:00.000Z", updatedAt: "2026-10-31T06:00:00.000Z", stages: stageSteps("booked", []), timeline: [], inspection: null, quotations: [],
    };
    const { rerender } = render(<ProjectTracker project={project} />);
    expect(screen.getByRole("region", { name: "Steps to complete" })).toBeInTheDocument();
    rerender(<ProjectTracker project={{ ...project, stage: "inspected", detailsEditable: false }} />);
    expect(screen.queryByRole("region", { name: "Steps to complete" })).toBeNull();
  });
});
