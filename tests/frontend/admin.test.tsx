import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { filterLeads, LeadsTable } from "@/components/admin/LeadsTable";
import { LoginForm } from "@/components/admin/LoginForm";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { LEAD_COLUMNS, type LeadRecord } from "@/lib/leads/store";

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
    expect(screen.getByText("No leads yet.")).toBeInTheDocument();
    rerender(<LeadsTable leads={leads} />);
    await userEvent.setup().type(screen.getByLabelText("Search leads"), "zzz");
    expect(screen.getByText("No leads match your search.")).toBeInTheDocument();
  });

  it("renders submitted HTML as plain text (no script injection)", () => {
    const evil = lead({ "Lead ID": "LX", Name: '<img src=x onerror="alert(1)">', Message: "<script>alert(1)</script>" });
    const { container } = render(<LeadsTable leads={[evil]} />);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
  });

  it("filterLeads matches across name, phone, locality, service and message", () => {
    expect(filterLeads(leads, "98765", "all").map((l) => l.Name)).toEqual(["Asha Verma"]);
    expect(filterLeads(leads, "shop", "all").map((l) => l.Name)).toEqual(["Ravi"]);
    expect(filterLeads(leads, "", "booking")).toHaveLength(2);
  });
});
