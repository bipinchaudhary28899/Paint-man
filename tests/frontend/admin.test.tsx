import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { address, crew, filterLeads, jobSize, leadsToCsv, LeadsTable, optionsOf, statusOf } from "@/components/admin/LeadsTable";
import { LoginForm } from "@/components/admin/LoginForm";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { LEAD_COLUMNS, type LeadRecord } from "@/lib/leads/record";

// Sign-in and sign-out end with a full page load (not a router transition); capture it here.
const nav = vi.hoisted(() => ({ hardNavigate: vi.fn() }));
vi.mock("@/lib/browser", () => nav);

const lead = (over: Partial<LeadRecord>): LeadRecord =>
  ({ ...Object.fromEntries(LEAD_COLUMNS.map((c) => [c, ""])), Status: "New", ...over }) as LeadRecord;

const leads = [
  lead({ "Lead ID": "L1", Name: "Asha Verma", Phone: "9876543210", Type: "booking", Locality: "Kamla Nagar", Service: "Interior Painting", "UTM Source": "google" }),
  lead({ "Lead ID": "L2", Name: "Ravi", Phone: "9123456789", Type: "contact", Message: "Shop repaint", Status: "Called" }),
  lead({ "Lead ID": "L3", Name: "Meena", Phone: "9000000001", Type: "booking", Locality: "Sikandra" }),
];

describe("LoginForm", () => {
  beforeEach(() => {
    nav.hardNavigate.mockReset();
  });

  it("uses a masked password field with the right autocomplete hints", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByLabelText("Username")).toHaveAttribute("autocomplete", "username");
  });

  it("signs in and loads the leads page fresh (a full page load, so no router race can blank it)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    render(<LoginForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Username"), "owner");
    await user.type(screen.getByLabelText("Password"), "secret-password-123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(nav.hardNavigate).toHaveBeenCalledWith("/admin"));
    expect(nav.hardNavigate).toHaveBeenCalledTimes(1);
    // stays in its busy state until the new page arrives
    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/admin/login");
    expect(init?.credentials).toBe("same-origin");
    expect(JSON.parse(String(init?.body))).toEqual({ username: "owner", password: "secret-password-123" });
  });

  it("shows the server's error on a failed sign-in", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: "Incorrect username or password." }), { status: 401 }),
    );
    render(<LoginForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Username"), "owner");
    await user.type(screen.getByLabelText("Password"), "nope");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect username or password.");
    expect(nav.hardNavigate).not.toHaveBeenCalled();
  });
});

describe("SignOutButton", () => {
  beforeEach(() => {
    nav.hardNavigate.mockReset();
  });

  it("signs out with a fetch, then loads the login page fresh", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    render(<SignOutButton />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(nav.hardNavigate).toHaveBeenCalledWith("/admin/login"));
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/admin/logout");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("accept")).toBe("application/json");
    expect(screen.getByRole("button", { name: "Signing out…" })).toBeDisabled();
  });

  it("falls back to the plain form post when the fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));
    const submit = vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(() => {});
    const { container } = render(<SignOutButton />);
    const form = container.querySelector("form")!;
    expect(form).toHaveAttribute("action", "/api/admin/logout");
    expect(form).toHaveAttribute("method", "post");
    await userEvent.setup().click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(submit).toHaveBeenCalled());
    expect(nav.hardNavigate).not.toHaveBeenCalled();
    submit.mockRestore();
  });
});

describe("LeadsTable", () => {
  it("shows summary counts", () => {
    render(<LeadsTable leads={leads} />);
    const card = (label: string) => screen.getByText(label, { selector: "p" }).parentElement!;
    expect(within(card("Total leads")).getByText("3")).toBeInTheDocument();
    expect(within(card("Inspection bookings")).getByText("2")).toBeInTheDocument();
    expect(within(card("Messages")).getByText("1")).toBeInTheDocument();
    expect(within(card("Status: New")).getByText("2")).toBeInTheDocument();
  });

  it("lists each lead with a tap-to-call link and source", () => {
    render(<LeadsTable leads={leads} />);
    expect(screen.getAllByRole("row")).toHaveLength(4); // header + 3
    expect(screen.getByRole("link", { name: "9876543210" })).toHaveAttribute("href", "tel:+919876543210");
    expect(screen.getByText("google")).toBeInTheDocument();
    expect(screen.getAllByText("Direct")).toHaveLength(2);
  });

  it("filters by search text and by type", async () => {
    render(<LeadsTable leads={leads} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Search leads"), "sikandra");
    expect(screen.getByText("1 shown")).toBeInTheDocument();
    expect(screen.getByText("Meena")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Search leads"));
    await user.selectOptions(screen.getByLabelText("Lead type"), "contact");
    expect(screen.getByText("1 shown")).toBeInTheDocument();
    expect(screen.getByText("Ravi")).toBeInTheDocument();
  });

  it("shows empty states", async () => {
    const { rerender } = render(<LeadsTable leads={[]} />);
    expect(screen.getByText(/^No leads yet\./)).toBeInTheDocument();
    // nothing to clear and nothing to download when there are no leads at all
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Download CSV/ })).toBeNull();
    rerender(<LeadsTable leads={leads} />);
    await userEvent.setup().type(screen.getByLabelText("Search leads"), "zzz");
    expect(screen.getByText("No leads match these filters.")).toBeInTheDocument();
  });

  it("renders submitted HTML as plain text (no script injection)", () => {
    const evil = lead({ "Lead ID": "LX", Name: '<img src=x onerror="alert(1)">', Message: "<script>alert(1)</script>" });
    const { container } = render(<LeadsTable leads={[evil]} />);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
  });

  it("shows the full address for new bookings and the locality alone for older ones, and searches it", () => {
    const full = lead({ Name: "Neha", Type: "booking", Address: "12, Rose Villa, Nehru Road", Locality: "Kamla Nagar", City: "Agra", "PIN Code": "282005" });
    expect(address(full)).toBe("12, Rose Villa, Nehru Road, Kamla Nagar, Agra 282005");
    expect(address(lead({ Locality: "Sikandra" }))).toBe("Sikandra");
    expect(filterLeads([full, ...leads], "282005", "all").map((l) => l.Name)).toEqual(["Neha"]);
  });

  it("filterLeads matches across name, phone, locality, service and message", () => {
    expect(filterLeads(leads, "98765", "all").map((l) => l.Name)).toEqual(["Asha Verma"]);
    expect(filterLeads(leads, "shop", "all").map((l) => l.Name)).toEqual(["Ravi"]);
    expect(filterLeads(leads, "", "booking")).toHaveLength(2);
  });
});


describe("job size in the leads table", () => {
  it("summarises the job and suggests a crew from the estimated area", () => {
    const big = lead({ Type: "booking", Floors: "2", "Home Size": "3 BHK", "Carpet Area per Floor (sq ft)": "1200", "Est. Paint Area (sq ft)": "8400" });
    expect(jobSize(big)).toBe("2 floors · 3 BHK · 1,200 sq ft/floor");
    expect(crew(big)).toBe("≈ 8,400 sq ft · 84 painter-days (8 × 11 days)");
    const noArea = lead({ Type: "booking", Floors: "1", "Home Size": "2 BHK" });
    expect(jobSize(noArea)).toBe("1 floor · 2 BHK");
    expect(crew(noArea)).toBe("Measure on site");
    const message = lead({ Type: "contact" });
    expect(jobSize(message)).toBe("");
    expect(crew(message)).toBe("");
  });

  it("shows the job-size columns in the table", () => {
    render(<LeadsTable leads={[lead({ "Lead ID": "L9", Name: "Kiran", Type: "booking", Floors: "2", "Home Size": "3 BHK", "Est. Paint Area (sq ft)": "8400" })]} />);
    expect(screen.getByRole("columnheader", { name: "Job size" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Est. area & crew" })).toBeInTheDocument();
    expect(screen.getByText("2 floors · 3 BHK")).toBeInTheDocument();
    expect(screen.getByText(/84 painter-days/)).toBeInTheDocument();
  });
});


describe("LeadsTable: filters, clearing and the CSV download", () => {
  const cityLeads = [
    lead({ "Lead ID": "A1", Name: "Asha", Phone: "9876543210", Type: "booking", City: "Agra", Locality: "Kamla Nagar" }),
    lead({ "Lead ID": "M1", Name: "Mohan", Phone: "9876500000", Type: "booking", City: "Mathura", Locality: "Krishna Nagar", Status: "Called" }),
    lead({ "Lead ID": "V1", Name: "Vimla", Phone: "9876511111", Type: "booking", City: "Vrindavan", Locality: "Raman Reti", Status: "" }),
  ];

  it("offers city and status filters built from the leads, and filters by them", async () => {
    expect(optionsOf(cityLeads, (l) => l.City)).toEqual(["Agra", "Mathura", "Vrindavan"]);
    expect(optionsOf(cityLeads, statusOf)).toEqual(["Called", "New"]);
    render(<LeadsTable leads={cityLeads} />);
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("City"), "Vrindavan");
    expect(screen.getByText("1 shown")).toBeInTheDocument();
    expect(screen.getByText("Vimla")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("City"), "");
    await user.selectOptions(screen.getByLabelText("Status"), "Called");
    expect(screen.getByText("1 shown")).toBeInTheDocument();
    expect(screen.getByText("Mohan")).toBeInTheDocument();
    expect(filterLeads(cityLeads, "", "all", { city: "Agra", status: "New" }).map((l) => l.Name)).toEqual(["Asha"]);
  });

  it("hides a filter that would have only one choice", () => {
    render(<LeadsTable leads={[cityLeads[0]]} />);
    expect(screen.queryByLabelText("City")).toBeNull();
    expect(screen.queryByLabelText("Status")).toBeNull();
  });

  it("clears every filter at once, from the toolbar or from the empty state", async () => {
    render(<LeadsTable leads={cityLeads} />);
    const user = userEvent.setup();
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
    await user.selectOptions(screen.getByLabelText("City"), "Mathura");
    await user.type(screen.getByLabelText("Search leads"), "nobody");
    expect(screen.getByText("No leads match these filters.")).toBeInTheDocument();
    const buttons = screen.getAllByRole("button", { name: "Clear filters" });
    expect(buttons).toHaveLength(2);
    await user.click(buttons[1]);
    expect(screen.getByText("3 shown")).toBeInTheDocument();
    expect(screen.getByLabelText("Search leads")).toHaveValue("");
    expect(screen.getByLabelText("City")).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
  });

  it("writes the leads as CSV with quoting, and never lets a cell run as a spreadsheet formula", () => {
    const csv = leadsToCsv([lead({ Name: "=HYPERLINK(\"x\")", Phone: "+919876543210", Message: "Two rooms, \"urgent\"\nplease", Type: "contact" })]);
    const [header, row] = csv.split("\r\n");
    expect(header).toBe("Received,Name,Phone,Type,Address,Property,Service,Job size,Preferred date,Message,Source,Status,Lead ID");
    expect(row).toContain(`"'=HYPERLINK(""x"")"`);
    expect(row).toContain("'+919876543210");
    expect(csv).toContain(`"Two rooms, ""urgent""\nplease"`);
    expect(row).toContain(",Direct,New,");
  });

  it("downloads only the leads being shown, as a dated CSV file", async () => {
    const createObjectURL = vi.fn(() => "blob:leads");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<LeadsTable leads={cityLeads} />);
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("City"), "Agra");
    await user.click(screen.getByRole("button", { name: "Download CSV (1)" }));
    expect(click).toHaveBeenCalledTimes(1);
    const blob = (createObjectURL.mock.calls[0] as unknown as [Blob])[0];
    const text = await blob.text();
    expect(text).toContain("Asha");
    expect(text).not.toContain("Mohan");
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toMatch(/^paint-saathi-leads-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:leads");
    click.mockRestore();
    vi.unstubAllGlobals();
  });
});
