import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/components/admin/ActionStatus";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { InspectionPanel } from "@/components/admin/InspectionPanel";
import { ProjectCustomer, mapLink } from "@/components/admin/ProjectCustomer";
import { ProjectFilters, ProjectList, ProjectPages, projectsHref, stageTint } from "@/components/admin/ProjectList";
import { ProjectTimeline } from "@/components/admin/ProjectTimeline";
import { QuotationEditor } from "@/components/admin/QuotationEditor";
import { QuotationsPanel } from "@/components/admin/QuotationsPanel";
import { QuotationView } from "@/components/admin/QuotationView";
import { StageControl, WorkStartControl } from "@/components/admin/StageControl";
import { adminSend } from "@/components/admin/useAdminAction";
import type { AdminProject, AdminProjectSummary, AdminQuotation } from "@/lib/projects/repo";

// The admin project tracker's components: the header switch, the projects list and filters, and
// the project page's panels (customer, stage, inspection, quotations with the line editor,
// timeline). Requests go to /api/admin (fetch is mocked) and a change refreshes the page's data.

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const PID = "11111111-1111-4111-8111-111111111111";

/** fetch answering each call with the next envelope (status 200 unless given). */
function mockFetch(...answers: { status?: number; body: unknown }[]) {
  const queue = [...answers];
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
    const next = queue.shift() ?? { body: { apiVersion: "v1", data: {} } };
    return new Response(JSON.stringify(next.body), { status: next.status ?? 200, headers: { "content-type": "application/json" } });
  });
}
const ok = (data: unknown = {}) => ({ body: { apiVersion: "v1", kind: "x", label: "Done", data } });
const fail = (status: number, message: string, details?: Record<string, string>) => ({ status, body: { apiVersion: "v1", kind: "error", label: message, error: { code: "x", message, ...(details && { details }) } } });
const call = (spy: ReturnType<typeof mockFetch>, n = 0) => {
  const [url, init] = spy.mock.calls[n];
  return { url, method: init?.method, body: init?.body ? JSON.parse(String(init.body)) : undefined };
};

const quotation = (over: Partial<AdminQuotation> = {}): AdminQuotation => ({
  id: "q1",
  version: 1,
  status: "draft",
  sentAt: null,
  approvedAt: null,
  validUntil: null,
  notes: null,
  paymentTerms: null,
  lines: [],
  subtotalPaise: 0,
  totalPaise: 0,
  currency: "INR",
  pdf: `/api/v1/projects/${PID}/quotations/q1/pdf`,
  createdAt: "2026-10-31T05:00:00.000Z",
  updatedAt: "2026-10-31T05:00:00.000Z",
  ...over,
});

const project = (over: Partial<AdminProject> = {}): AdminProject => ({
  id: PID,
  service: "Interior Painting",
  city: "Agra",
  citySlug: "agra",
  locality: "Kamla Nagar",
  stage: "booked",
  stageLabel: "Booking received",
  currency: "INR",
  address: "12 Rose Villa, Nehru Road",
  pincode: "282005",
  stageExplanation: "We call you during working hours to fix the visit.",
  workStartsOn: null,
  createdAt: "2026-10-30T04:30:00.000Z",
  updatedAt: "2026-10-31T06:00:00.000Z",
  stages: [],
  inspection: null,
  name: "Asha Verma",
  phone: "9876543210",
  userId: null,
  lead: {
    id: "lead-1",
    source: "app",
    propertyType: "Independent House",
    floors: "2",
    homeSize: "3 BHK",
    carpetArea: 1200,
    estPaintArea: 8400,
    preferredDate: "2026-11-02",
    message: "Cracks on the east wall",
    location: { lat: 27.2046, lng: 78.0029 },
    createdAt: "2026-10-30T04:30:00.000Z",
  },
  timeline: [
    { id: "e1", stage: "booked", label: "Booking received", note: null, at: "2026-10-30T04:30:00.000Z" },
    { id: "e2", stage: "call_confirmed", label: "Visit being arranged", note: "Visit fixed for Tuesday", at: "2026-10-31T06:00:00.000Z" },
  ],
  quotations: [],
  ...over,
});

beforeEach(() => {
  router.refresh.mockReset();
});

describe("AdminHeader", () => {
  it("names the page in its h1 and switches between Leads and Projects", () => {
    render(
      <AdminHeader title="Projects" user="owner" current="projects">
        Loaded now
      </AdminHeader>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Projects" })).toBeInTheDocument();
    expect(screen.getByText(/Signed in as owner/)).toHaveTextContent("Signed in as owner · Loaded now");
    const nav = screen.getByRole("navigation", { name: "Admin" });
    expect(within(nav).getByRole("link", { name: "Leads" })).toHaveAttribute("href", "/admin");
    expect(within(nav).getByRole("link", { name: "Leads" })).not.toHaveAttribute("aria-current");
    expect(within(nav).getByRole("link", { name: "Projects" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("leaves out the extra line when the page has none", () => {
    render(<AdminHeader title="Leads" user="owner" current="leads" />);
    expect(screen.getByText("Signed in as owner")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Leads" })).toHaveAttribute("aria-current", "page");
  });
});

describe("projects list", () => {
  const summary = (over: Partial<AdminProjectSummary>): AdminProjectSummary => ({
    id: PID,
    service: "Interior Painting",
    city: "Agra",
    citySlug: "agra",
    locality: "Kamla Nagar",
    stage: "booked",
    stageLabel: "Booking received",
    createdAt: "2026-10-30T04:30:00.000Z",
    updatedAt: "2026-10-31T06:00:00.000Z",
    currency: "INR",
    name: "Asha Verma",
    phone: "9876543210",
    userId: null,
    leadId: "lead-1",
    ...over,
  });

  it("shows each project with its customer, stage, last update and final price, linking to the project", () => {
    render(<ProjectList items={[summary({ finalPricePaise: 4_512_350, stage: "price_finalised", stageLabel: "Price finalised" }), summary({ id: "p2", name: "Ravi", service: null, locality: null, city: null })]} filtered={false} />);
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Asha Verma" })).toHaveAttribute("href", `/admin/projects/${PID}`);
    expect(screen.getByRole("link", { name: "Ravi" })).toHaveAttribute("href", "/admin/projects/p2");
    expect(screen.getAllByRole("link", { name: "9876543210" })[0]).toHaveAttribute("href", "tel:+919876543210");
    expect(screen.getByText("Price finalised")).toBeInTheDocument();
    expect(screen.getByText("₹45,123.50")).toBeInTheDocument();
    expect(screen.getByText("Kamla Nagar, Agra")).toBeInTheDocument();
    const ravi = screen.getByRole("link", { name: "Ravi" }).closest("tr")!;
    expect(within(ravi).getAllByText("—")).toHaveLength(3); // service, place and price
  });

  it("explains an empty list, filtered or not", () => {
    const { rerender } = render(<ProjectList items={[]} filtered={false} />);
    expect(screen.getByText(/No projects yet/)).toBeInTheDocument();
    rerender(<ProjectList items={[]} filtered />);
    expect(screen.getByText("No projects match these filters.")).toBeInTheDocument();
  });

  it("tints stages: live work, paused, cancelled and handed over", () => {
    expect(stageTint("in_progress")).toContain("bg-sky-wash");
    expect(stageTint("on_hold")).toContain("bg-peach-wash");
    expect(stageTint("cancelled")).toContain("text-muted");
    expect(stageTint("completed")).toContain("bg-sage-deep");
  });

  it("filters with a plain GET form that keeps the choices", () => {
    const cities = [
      { slug: "agra", name: "Agra" },
      { slug: "mathura", name: "Mathura" },
    ];
    const { container, rerender } = render(<ProjectFilters values={{}} cities={cities} shown={2} total={2} />);
    const form = container.querySelector("form")!;
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/admin/projects");
    expect(screen.getByText("2 projects")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Clear filters" })).toBeNull();
    expect(within(screen.getByLabelText("Stage")).getByRole("option", { name: "On hold" })).toHaveValue("on_hold");

    rerender(<ProjectFilters values={{ stage: "on_hold", city: "mathura", q: "98765" }} cities={cities} shown={50} total={120} />);
    expect(screen.getByLabelText("Search projects by name or phone")).toHaveValue("98765");
    expect(screen.getByLabelText("Stage")).toHaveValue("on_hold");
    expect(screen.getByLabelText("City")).toHaveValue("mathura");
    expect(screen.getByText("50 of 120 shown")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute("href", "/admin/projects");
    rerender(<ProjectFilters values={{}} cities={cities} shown={1} total={1} />);
    expect(screen.getByText("1 project")).toBeInTheDocument();
  });

  it("pages through long lists, keeping the filters", () => {
    expect(projectsHref({})).toBe("/admin/projects");
    expect(projectsHref({ stage: "booked", q: "asha" }, 3)).toBe("/admin/projects?q=asha&stage=booked&page=3");
    const { container, rerender } = render(<ProjectPages values={{ city: "agra" }} page={1} pages={1} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<ProjectPages values={{ city: "agra" }} page={1} pages={3} />);
    expect(screen.queryByRole("link", { name: "Previous" })).toBeNull();
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("href", "/admin/projects?city=agra&page=2");
    rerender(<ProjectPages values={{ city: "agra" }} page={3} pages={3} />);
    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute("href", "/admin/projects?city=agra&page=2");
    expect(screen.queryByRole("link", { name: "Next" })).toBeNull();
    expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();
  });
});

describe("ProjectCustomer", () => {
  it("shows the customer, address, map pin and what the booking said", () => {
    render(<ProjectCustomer project={project()} />);
    expect(screen.getByRole("heading", { level: 2, name: "Customer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "9876543210" })).toHaveAttribute("href", "tel:+919876543210");
    expect(screen.getByText("12 Rose Villa, Nehru Road, Kamla Nagar, Agra 282005")).toBeInTheDocument();
    const pin = screen.getByRole("link", { name: "Open in Google Maps" });
    expect(pin).toHaveAttribute("href", "https://maps.google.com/?q=27.2046,78.0029");
    expect(pin).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText(/Not signed in yet/)).toBeInTheDocument();
    expect(screen.getByText("2 floors · 3 BHK · 1,200 sq ft/floor")).toBeInTheDocument();
    expect(screen.getByText("≈ 8,400 sq ft")).toBeInTheDocument();
    expect(screen.getByText("Cracks on the east wall")).toBeInTheDocument();
    expect(screen.getByText(/· App$/)).toBeInTheDocument();
    expect(mapLink({ lat: 1.5, lng: -2 })).toBe("https://maps.google.com/?q=1.5,-2");
  });

  it("has no map link without a pin, and copes with a project without its lead", () => {
    const base = project();
    const { rerender } = render(<ProjectCustomer project={project({ userId: "u1", lead: { ...base.lead!, location: null, source: "web", floors: "1", homeSize: null, carpetArea: null, estPaintArea: null, propertyType: null, preferredDate: null, message: null } })} />);
    expect(screen.queryByRole("link", { name: "Open in Google Maps" })).toBeNull();
    expect(screen.getByText(/Signed in: sees this project/)).toBeInTheDocument();
    expect(screen.getByText("1 floor")).toBeInTheDocument();
    expect(screen.getByText(/· Website$/)).toBeInTheDocument();
    rerender(<ProjectCustomer project={project({ lead: null, address: null, locality: null, city: null, pincode: null, service: null })} />);
    expect(screen.queryByText("Booked")).toBeNull();
    expect(screen.getAllByText("—")).toHaveLength(2);
  });
});

describe("ProjectTimeline", () => {
  it("lists events newest first with the note the customer saw", () => {
    render(<ProjectTimeline events={project().timeline} />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Visit being arranged");
    expect(items[0]).toHaveTextContent("Customer sees: Visit fixed for Tuesday");
    expect(items[1]).toHaveTextContent("Booking received");
    expect(items[1]).not.toHaveTextContent("Customer sees");
  });

  it("says when there is nothing yet", () => {
    render(<ProjectTimeline events={[]} />);
    expect(screen.getByText("No events yet.")).toBeInTheDocument();
  });
});

describe("StageControl", () => {
  const renderStage = (over: Partial<Parameters<typeof StageControl>[0]> = {}) =>
    render(<StageControl projectId={PID} stage="booked" stageExplanation="We call you during working hours to fix the visit." workStartsOn={null} {...over} />);

  it("shows the current stage and what the customer reads, and explains that the note is shown to them", () => {
    renderStage();
    expect(screen.getByText("Booking received", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Customer sees: “We call you during working hours to fix the visit.”")).toBeInTheDocument();
    expect(screen.getByLabelText(/Note for the customer/)).toHaveAccessibleDescription(/Shown to the customer on their tracker/);
    expect(screen.getByRole("button", { name: "Post update" })).toBeDisabled();
  });

  it("moves the project to the chosen stage with the note, then refreshes the page", async () => {
    const spy = mockFetch(ok({ stage: "call_confirmed" }));
    renderStage();
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Set stage"), "call_confirmed");
    await user.type(screen.getByLabelText(/Note for the customer/), "Visit fixed for Tuesday");
    await user.click(screen.getByRole("button", { name: "Update stage" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Moved to “Visit being arranged”.");
    expect(call(spy)).toEqual({ url: `/api/admin/projects/${PID}/stage`, method: "POST", body: { stage: "call_confirmed", note: "Visit fixed for Tuesday" } });
    expect(spy.mock.calls[0][1]?.credentials).toBe("same-origin");
    expect(router.refresh).toHaveBeenCalled();
    expect(screen.getByLabelText(/Note for the customer/)).toHaveValue("");
  });

  it("posts a progress update at the current stage, and shows the server's refusal", async () => {
    mockFetch(ok(), fail(404, "No such project."));
    renderStage({ stage: "in_progress", stageExplanation: "Supervised work, with photo updates." });
    const user = userEvent.setup();
    expect(screen.getByRole("option", { name: "Painting in progress (current)" })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Note for the customer/), "Second coat done");
    await user.click(screen.getByRole("button", { name: "Post update" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Update posted.");
    await user.type(screen.getByLabelText(/Note for the customer/), "Again");
    await user.click(screen.getByRole("button", { name: "Post update" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No such project.");
    expect(screen.getByLabelText(/Note for the customer/)).toHaveValue("Again");
  });

  it("offers a way back in when the admin session has ended", async () => {
    mockFetch(fail(401, "Your admin session has ended. Sign in again at /admin/login."));
    renderStage();
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Set stage"), "cancelled");
    await user.click(screen.getByRole("button", { name: "Update stage" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Your admin session has ended.");
    expect(within(alert).getByRole("link", { name: "Sign in again" })).toHaveAttribute("href", "/admin/login");
    expect(router.refresh).not.toHaveBeenCalled();
  });
});

describe("WorkStartControl", () => {
  it("saves and clears the crew's start date", async () => {
    const spy = mockFetch(ok(), ok());
    render(<WorkStartControl projectId={PID} workStartsOn="2026-11-10" />);
    const user = userEvent.setup();
    const input = screen.getByLabelText("Work start date");
    expect(input).toHaveValue("2026-11-10");
    expect(screen.getByRole("button", { name: "Save date" })).toBeDisabled();
    await user.clear(input);
    await user.type(input, "2026-11-12");
    await user.click(screen.getByRole("button", { name: "Save date" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Start date saved.");
    expect(call(spy)).toEqual({ url: `/api/admin/projects/${PID}/work-start`, method: "PUT", body: { workStartsOn: "2026-11-12" } });
    await user.click(screen.getByRole("button", { name: "Clear" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Start date cleared."));
    expect(call(spy, 1).body).toEqual({ workStartsOn: null });
    expect(input).toHaveValue("");
  });

  it("saves an emptied date as a clear", async () => {
    const spy = mockFetch(ok());
    render(<WorkStartControl projectId={PID} workStartsOn="2026-11-10" />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText("Work start date"));
    await user.click(screen.getByRole("button", { name: "Save date" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Start date cleared.");
    expect(call(spy).body).toEqual({ workStartsOn: null });
  });

  it("has no Clear button before a date is set", () => {
    render(<WorkStartControl projectId={PID} workStartsOn={null} />);
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
  });
});

describe("InspectionPanel", () => {
  it("schedules the visit in India time with the inspector", async () => {
    const spy = mockFetch(ok());
    render(<InspectionPanel projectId={PID} inspection={null} />);
    expect(screen.getByText("Not scheduled yet.")).toBeInTheDocument();
    const user = userEvent.setup();
    expect(screen.getByRole("button", { name: "Schedule inspection" })).toBeDisabled();
    await user.type(screen.getByLabelText("Date"), "2026-11-04");
    await user.clear(screen.getByLabelText("Time (India)"));
    await user.type(screen.getByLabelText("Time (India)"), "11:30");
    await user.type(screen.getByLabelText("Inspector"), "Ramesh");
    await user.click(screen.getByRole("button", { name: "Schedule inspection" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Inspection scheduled.");
    expect(call(spy)).toEqual({ url: `/api/admin/projects/${PID}/inspection`, method: "PUT", body: { scheduledAt: "2026-11-04T11:30:00+05:30", inspectorName: "Ramesh" } });
    expect(router.refresh).toHaveBeenCalled();
  });

  it("prefills a scheduled visit and marks it visited with the findings", async () => {
    const spy = mockFetch(ok());
    render(<InspectionPanel projectId={PID} inspection={{ scheduledAt: "2026-11-04T06:00:00.000Z", visitedAt: null, inspectorName: "Ramesh", findings: null }} />);
    expect(screen.getByText(/Scheduled for/)).toHaveTextContent("Inspector: Ramesh");
    expect(screen.getByLabelText("Date")).toHaveValue("2026-11-04");
    expect(screen.getByLabelText("Time (India)")).toHaveValue("11:30");
    expect(screen.getByRole("button", { name: "Reschedule" })).toBeInTheDocument();
    expect(screen.getByLabelText("Findings")).toHaveAccessibleDescription(/Shown to the customer/);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Findings"), "Damp on the north wall");
    await user.click(screen.getByRole("button", { name: "Mark visited" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Marked visited.");
    expect(call(spy)).toEqual({ url: `/api/admin/projects/${PID}/inspection/visit`, method: "POST", body: { findings: "Damp on the north wall" } });
  });

  it("keeps the recorded visit time when the findings are saved again", async () => {
    const spy = mockFetch(ok());
    const visitedAt = "2026-11-04T07:00:00.000Z";
    render(<InspectionPanel projectId={PID} inspection={{ scheduledAt: null, visitedAt, inspectorName: null, findings: "Damp" }} />);
    expect(screen.getByText(/^Visited/)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Findings"), "; waterproof first");
    await user.click(screen.getByRole("button", { name: "Save findings" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Findings saved.");
    expect(call(spy).body).toEqual({ findings: "Damp; waterproof first", visitedAt });
  });
});

describe("QuotationView", () => {
  it("shows a sent version read-only, with its totals, notes and terms", () => {
    const q = quotation({
      status: "approved",
      sentAt: "2026-11-01T05:00:00.000Z",
      approvedAt: "2026-11-02T05:00:00.000Z",
      validUntil: "2026-11-30",
      notes: "Furniture moved by us",
      paymentTerms: "50% at start",
      lines: [
        { position: 1, item: "Living room walls", description: "2 coats", areaSqft: 1200, coats: 2, ratePaise: 2_550, amountPaise: 3_060_000 },
        { position: 2, item: "Main door", description: null, areaSqft: null, coats: null, ratePaise: null, amountPaise: 250_050 },
      ],
      subtotalPaise: 3_310_050,
      totalPaise: 3_310_050,
    });
    render(<QuotationView quotation={q} />);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByText(/Sent .* Approved .* Valid until/)).toBeInTheDocument();
    expect(screen.getByText("1,200")).toBeInTheDocument();
    expect(screen.getByText("₹25.50")).toBeInTheDocument();
    expect(screen.getByText("₹2,500.50")).toBeInTheDocument();
    expect(screen.getAllByText("₹33,100.50")).toHaveLength(2);
    expect(screen.getByText("Furniture moved by us")).toBeInTheDocument();
    expect(screen.getByText("50% at start")).toBeInTheDocument();
  });

  it("leaves out empty notes and dates", () => {
    render(<QuotationView quotation={quotation({ status: "sent" })} />);
    expect(screen.queryByText("Notes")).toBeNull();
    expect(screen.queryByText("Payment terms")).toBeNull();
  });
});

describe("QuotationEditor", () => {
  const draft = quotation({
    lines: [{ position: 1, item: "Living room walls", description: null, areaSqft: 420, coats: 2, ratePaise: 2_500, amountPaise: 1_050_000 }],
    subtotalPaise: 1_050_000,
    totalPaise: 1_050_000,
    validUntil: "2026-11-30",
  });
  const total = () => screen.getByText("Total").closest("tr")!;

  it("fills the amount from area × rate, lets staff type over it, and totals live", async () => {
    render(<QuotationEditor projectId={PID} quotation={draft} />);
    const user = userEvent.setup();
    expect(screen.getByLabelText("Line 1 Amount (₹)")).toHaveValue("10500");
    expect(total()).toHaveTextContent("₹10,500");

    await user.clear(screen.getByLabelText("Line 1 Rate (₹/sq ft)"));
    await user.type(screen.getByLabelText("Line 1 Rate (₹/sq ft)"), "25.50");
    expect(screen.getByLabelText("Line 1 Amount (₹)")).toHaveValue("10710");
    await user.clear(screen.getByLabelText("Line 1 Amount (₹)"));
    await user.type(screen.getByLabelText("Line 1 Amount (₹)"), "10000");
    expect(total()).toHaveTextContent("₹10,000");

    await user.click(screen.getByRole("button", { name: "Add line" }));
    await user.type(screen.getByLabelText("Line 2 Item"), "Main door");
    await user.type(screen.getByLabelText("Line 2 Amount (₹)"), "2500.50");
    expect(total()).toHaveTextContent("₹12,500.50");
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("moves and removes lines", async () => {
    render(<QuotationEditor projectId={PID} quotation={draft} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Add line" }));
    await user.type(screen.getByLabelText("Line 2 Item"), "Main door");
    expect(screen.getByRole("button", { name: "Move line 1 up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move line 2 down" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Move line 2 up" }));
    expect(screen.getByLabelText("Line 1 Item")).toHaveValue("Main door");
    await user.click(screen.getByRole("button", { name: "Move line 1 down" }));
    expect(screen.getByLabelText("Line 1 Item")).toHaveValue("Living room walls");
    await user.click(screen.getByRole("button", { name: "Remove line 1" }));
    expect(screen.getByLabelText("Line 1 Item")).toHaveValue("Main door");
    expect(screen.queryByLabelText("Line 2 Item")).toBeNull();
  });

  it("starts an empty draft with one blank line", () => {
    render(<QuotationEditor projectId={PID} quotation={quotation()} />);
    expect(screen.getByLabelText("Line 1 Item")).toHaveValue("");
    expect(total()).toHaveTextContent("₹0");
  });

  it("checks the lines before saving and names the line to fix", async () => {
    const spy = mockFetch();
    render(<QuotationEditor projectId={PID} quotation={quotation()} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Line 1 Amount (₹)"), "12.345");
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Line 1: name the room or item.");
    expect(alert).toHaveTextContent("Line 1: enter the amount in rupees (up to ₹1 crore), e.g. 10500.");
    expect(screen.getByLabelText("Line 1 Item")).toHaveAttribute("aria-invalid", "true");
    expect(spy).not.toHaveBeenCalled();
  });

  it("saves the draft in paise, then refreshes the page", async () => {
    const spy = mockFetch(ok({ lines: 1 }));
    render(<QuotationEditor projectId={PID} quotation={draft} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Notes"), "Furniture moved by us");
    await user.type(screen.getByLabelText("Payment terms"), "50% at start");
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Draft saved.");
    expect(call(spy)).toEqual({
      url: `/api/admin/projects/${PID}/quotations/q1`,
      method: "PUT",
      body: {
        lines: [{ item: "Living room walls", description: null, areaSqft: 420, coats: 2, ratePaise: 2_500, amountPaise: 1_050_000 }],
        notes: "Furniture moved by us",
        paymentTerms: "50% at start",
        validUntil: "2026-11-30",
      },
    });
    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Unsaved changes")).toBeNull();
  });

  it("shows the server's message when the save is refused", async () => {
    mockFetch(fail(409, "Version 1 has been sent; start a new version to change it."));
    render(<QuotationEditor projectId={PID} quotation={draft} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("start a new version");
  });

  it("sends after a confirmation: saves first, then shares it with the customer", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const spy = mockFetch(ok(), ok({ status: "sent" }));
    render(<QuotationEditor projectId={PID} quotation={draft} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Send to customer" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Version 1 sent to the customer."));
    expect(confirm.mock.calls[0][0]).toMatch(/Send version 1 to the customer\? They will see it on their tracker/);
    expect(call(spy, 0).method).toBe("PUT");
    expect(call(spy, 1)).toEqual({ url: `/api/admin/projects/${PID}/quotations/q1/status`, method: "POST", body: { status: "sent" } });
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("sends nothing when the confirmation is cancelled, the lines have problems or there are none", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const spy = mockFetch();
    render(<QuotationEditor projectId={PID} quotation={draft} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Send to customer" }));
    expect(spy).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await user.clear(screen.getByLabelText("Line 1 Item"));
    await user.click(screen.getByRole("button", { name: "Send to customer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Line 1: name the room or item.");
    expect(spy).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Remove line 1" }));
    await user.click(screen.getByRole("button", { name: "Send to customer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Add at least one line before sending the quotation.");
    expect(spy).not.toHaveBeenCalled();
  });

  it("warns before leaving with unsaved changes, and links the PDF preview", async () => {
    const add = vi.spyOn(window, "addEventListener");
    render(<QuotationEditor projectId={PID} quotation={draft} pdfHref="/api/admin/x.pdf" />);
    expect(screen.getByRole("link", { name: "Preview PDF" })).toHaveAttribute("href", "/api/admin/x.pdf");
    await userEvent.setup().type(screen.getByLabelText("Line 1 Item"), "!");
    const warn = add.mock.calls.find(([type]) => type === "beforeunload")?.[1] as (e: Event) => void;
    expect(warn).toBeDefined();
    const event = new Event("beforeunload", { cancelable: true });
    warn(event);
    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByRole("link", { name: "Preview PDF (last saved)" })).toBeInTheDocument();
  });
});

describe("QuotationsPanel", () => {
  it("starts the first quotation and opens it", async () => {
    const spy = mockFetch({ status: 201, body: { apiVersion: "v1", data: { id: "q1", version: 1, status: "draft" } } });
    render(<QuotationsPanel projectId={PID} quotations={[]} />);
    expect(screen.getByText(/No quotation yet/)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Start quotation" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Version 1 started.");
    expect(call(spy)).toEqual({ url: `/api/admin/projects/${PID}/quotations`, method: "POST", body: undefined });
    expect(router.refresh).toHaveBeenCalled();
  });

  it("edits the draft and offers no second version while it is open", () => {
    render(<QuotationsPanel projectId={PID} quotations={[quotation({ id: "q2", version: 2 }), quotation({ id: "q1", status: "sent", totalPaise: 100 })]} />);
    expect(screen.getByRole("form", { name: "Edit quotation version 2" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /New version/ })).toBeNull();
    expect(screen.getByText(/Drafts are visible only to staff/)).toBeInTheDocument();
  });

  it("shows other versions read-only and records the customer's answer after a confirmation", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const spy = mockFetch(ok({ status: "declined" }), ok({ status: "approved" }));
    const sent = quotation({ id: "q2", version: 2, status: "sent", totalPaise: 4_500_000 });
    const old = quotation({ id: "q1", version: 1, status: "superseded" });
    render(<QuotationsPanel projectId={PID} quotations={[sent, old]} pdf />);
    const user = userEvent.setup();
    expect(screen.getByRole("button", { name: /^v2/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: "Preview PDF" })).toHaveAttribute("href", `/api/admin/projects/${PID}/quotations/q2/pdf`);

    await user.click(screen.getByRole("button", { name: "Mark declined" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Version 2 marked declined.");
    expect(call(spy)).toEqual({ url: `/api/admin/projects/${PID}/quotations/q2/status`, method: "POST", body: { status: "declined" } });

    await user.click(screen.getByRole("button", { name: "Mark approved" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Version 2 approved: the price is final."));
    expect(confirm.mock.calls[1][0]).toMatch(/price becomes final \(₹45,000\)/);
    expect(call(spy, 1).body).toEqual({ status: "approved" });

    // the superseded version: read-only, no answer to record
    await user.click(screen.getByRole("button", { name: /^v1/ }));
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Version 1");
    expect(screen.queryByRole("button", { name: "Mark approved" })).toBeNull();
    // with no draft open, a new version copies the latest
    expect(screen.getByRole("button", { name: "New version (copy of v2)" })).toBeInTheDocument();
  });

  it("offers approval of a declined version, and does nothing when the confirmation is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const spy = mockFetch();
    render(<QuotationsPanel projectId={PID} quotations={[quotation({ status: "declined" })]} />);
    expect(screen.queryByRole("button", { name: "Mark declined" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Preview PDF" })).toBeNull();
    await userEvent.setup().click(screen.getByRole("button", { name: "Mark approved" }));
    expect(spy).not.toHaveBeenCalled();
  });

  it("starts a revision from the latest version and opens it", async () => {
    mockFetch({ status: 201, body: { apiVersion: "v1", data: { id: "q2", version: 2 } } });
    render(<QuotationsPanel projectId={PID} quotations={[quotation({ status: "approved" })]} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "New version (copy of v1)" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Version 2 started from version 1.");
  });
});

describe("adminSend and ActionStatus", () => {
  it("reads failures: the envelope's message and details, a non-JSON answer, a network error", async () => {
    mockFetch(fail(400, "Line 2: Name the room or item", { "lines.1.item": "Name the room or item" }));
    expect(await adminSend("PUT", "/api/admin/x", {})).toEqual({ ok: false, status: 400, message: "Line 2: Name the room or item", details: { "lines.1.item": "Name the room or item" } });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("<html>", { status: 502 }));
    expect(await adminSend("POST", "/api/admin/x")).toEqual({ ok: false, status: 502, message: "Something went wrong (error 502). Try again." });
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("offline"));
    expect(await adminSend("POST", "/api/admin/x")).toMatchObject({ ok: false, status: 0, message: expect.stringMatching(/Network error/) });
  });

  it("shows nothing, a success line or an error", () => {
    const { container, rerender } = render(<ActionStatus error={null} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<ActionStatus error={null} done="Saved." />);
    expect(screen.getByRole("status")).toHaveTextContent("Saved.");
    rerender(<ActionStatus error={{ ok: false, status: 409, message: "Already sent." }} done="Saved." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Already sent.");
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("following changes made elsewhere on the page", () => {
  it("moves the stage choice along when the stage changes on its own (e.g. after scheduling the inspection)", async () => {
    const { rerender } = render(<StageControl projectId={PID} stage="booked" stageExplanation="x" workStartsOn={null} />);
    await userEvent.setup().selectOptions(screen.getByLabelText("Set stage"), "call_confirmed");
    rerender(<StageControl projectId={PID} stage="inspection_scheduled" stageExplanation="y" workStartsOn={null} />);
    expect(screen.getByLabelText("Set stage")).toHaveValue("inspection_scheduled");
    expect(screen.getByRole("button", { name: "Post update" })).toBeDisabled();
  });

  it("says the version was sent once the editor gives way to the read-only view", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockFetch({ status: 201, body: { apiVersion: "v1", data: { id: "q1", version: 1 } } }, ok(), ok({ status: "sent" }));
    const line = { position: 1, item: "Hall", description: null, areaSqft: null, coats: null, ratePaise: null, amountPaise: 100_000 };
    const { rerender } = render(<QuotationsPanel projectId={PID} quotations={[]} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Start quotation" }));
    rerender(<QuotationsPanel projectId={PID} quotations={[quotation({ lines: [line], totalPaise: 100_000 })]} />);
    await user.click(screen.getByRole("button", { name: "Send to customer" }));
    await waitFor(() => expect(screen.getAllByRole("status").map((s) => s.textContent)).toContain("Version 1 sent to the customer."));
    rerender(<QuotationsPanel projectId={PID} quotations={[quotation({ status: "sent", lines: [line], totalPaise: 100_000 })]} />);
    expect(screen.getAllByRole("status").map((s) => s.textContent)).toEqual(["Version 1 sent to the customer."]);
  });
});

describe("the less common paths", () => {
  it("marks an off-line stage as current, and keeps the date when clearing it fails", async () => {
    mockFetch(fail(500, "Something went wrong on our side. Please try again."));
    render(<StageControl projectId={PID} stage="on_hold" stageExplanation="This project is paused for now." workStartsOn="2026-11-10" />);
    expect(screen.getByRole("option", { name: "On hold (current)" })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Clear" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    expect(screen.getByLabelText("Work start date")).toHaveValue("2026-11-10");
  });

  it("shows why a new version could not be started, and the open draft while another version is viewed", async () => {
    mockFetch(fail(404, "No such project."));
    const { rerender } = render(<QuotationsPanel projectId={PID} quotations={[]} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Start quotation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No such project.");
    rerender(<QuotationsPanel projectId={PID} quotations={[quotation({ id: "q2", version: 2 }), quotation({ id: "q1", status: "declined" })]} />);
    await userEvent.setup().click(screen.getByRole("button", { name: /^v1/ }));
    expect(screen.getByText(/A draft is open/)).toBeInTheDocument();
  });

  it("edits a line's description", async () => {
    render(<QuotationEditor projectId={PID} quotation={quotation()} />);
    await userEvent.setup().type(screen.getByLabelText("Line 1 Description"), "Putty and primer");
    expect(screen.getByLabelText("Line 1 Description")).toHaveValue("Putty and primer");
  });

  it("leaves out the floors when the booking gave none", () => {
    const base = project();
    render(<ProjectCustomer project={project({ lead: { ...base.lead!, floors: null } })} />);
    expect(screen.getByText("3 BHK · 1,200 sq ft/floor")).toBeInTheDocument();
  });
});
