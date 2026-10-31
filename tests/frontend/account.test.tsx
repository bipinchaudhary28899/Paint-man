import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteAccount, NameForm, SignOutButton } from "@/components/account/AccountActions";
import { AccountLink, TrackBookingInvite } from "@/components/account/AccountLink";
import { ProjectCard, ProjectsEmpty, StagePill, StageProgress } from "@/components/account/ProjectCard";
import { InspectionCard, ProjectHelp, ProjectStatus, ProjectTimeline, ProjectTracker, QuotationCard, QuotationList, StageStepper } from "@/components/account/ProjectTracker";
import { Header } from "@/components/Header";
import { site } from "@/config/site";
import type { ProjectDetail, ProjectSummary, Quotation } from "@/lib/projects/repo";
import { stageSteps } from "@/lib/projects/stages";
import { fakeContact, withFilledSite } from "../support/filled-site";

// The account pages' components: the header's Log in / My account, the thank-you invite, the
// account controls, the project cards and the tracker.

const nav = vi.hoisted(() => ({ hardNavigate: vi.fn() }));
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }));
const pathname = vi.hoisted(() => vi.fn(() => "/"));
vi.mock("@/lib/browser", () => nav);
vi.mock("next/navigation", () => ({ usePathname: pathname, useRouter: () => router, useSearchParams: () => new URLSearchParams() }));

const signIn = () => (document.cookie = "ps_signed_in=1; path=/");
beforeEach(() => {
  nav.hardNavigate.mockReset();
  router.refresh.mockReset();
  pathname.mockReturnValue("/");
});
afterEach(() => {
  document.cookie = "ps_signed_in=; max-age=0; path=/";
});

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const ok = (data: unknown) => json(200, { apiVersion: "v1", kind: "x", label: "x", data, meta: {} });
const failure = (status: number, code: string, message: string, details?: unknown) => json(status, { apiVersion: "v1", kind: "error", label: message, error: { code, message, ...(details !== undefined && { details }) }, meta: {} });
const answer = (...responses: Response[]) => vi.spyOn(globalThis, "fetch").mockImplementation(async () => responses.shift() ?? json(500, {}));

describe("AccountLink (header)", () => {
  it("says Log in without the sign-in hint, and My account with it; never prefetches", () => {
    const { unmount } = render(<AccountLink />);
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    unmount();
    signIn();
    pathname.mockReturnValue("/account/projects/x");
    render(<AccountLink />);
    const link = screen.getByRole("link", { name: "My account" });
    expect(link).toHaveAttribute("href", "/account");
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("reads the cookie again when the tab comes back into view", async () => {
    render(<AccountLink />);
    expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
    signIn();
    window.dispatchEvent(new Event("focus"));
    expect(await screen.findByRole("link", { name: "My account" })).toBeInTheDocument();
  });

  it("is in the header on every screen size, beside the booking button", () => {
    pathname.mockReturnValue("/login");
    render(<Header />);
    const login = screen.getByRole("link", { name: "Log in" });
    expect(login).toHaveAttribute("aria-current", "page");
    expect(login.className).toContain("w-[7.25rem]"); // one width for both labels: no shift when it changes
    expect(screen.getByRole("link", { name: "Book site visit" })).toHaveAttribute("href", "/book");
  });
});

describe("TrackBookingInvite (thank-you page)", () => {
  it("invites the visitor to log in with the same number, coming back to the account", () => {
    render(<TrackBookingInvite />);
    expect(screen.getByRole("heading", { level: 2, name: "Track it online" })).toBeInTheDocument();
    expect(screen.getByText(/Log in with the same mobile number/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in to track it" })).toHaveAttribute("href", "/login?next=%2Faccount");
  });

  it("links straight to the account when signed in", () => {
    signIn();
    render(<TrackBookingInvite />);
    expect(screen.getByRole("link", { name: "Go to my account" })).toHaveAttribute("href", "/account");
  });

  it("shows after a booking only", async () => {
    const { ThankYouMessage } = await import("@/components/ThankYouMessage");
    for (const [type, shown] of [["booking", true], ["contact", false], ["waitlist", false]] as const) {
      window.history.replaceState(null, "", `/thank-you?type=${type}`);
      const { unmount } = render(<ThankYouMessage />);
      await waitFor(() => expect(Boolean(screen.queryByRole("heading", { name: "Track it online" })), type).toBe(shown));
      unmount();
    }
    window.history.replaceState(null, "", "/");
  });
});

describe("NameForm", () => {
  it("asks for a name the first time, saves it and refreshes the greeting", async () => {
    const user = userEvent.setup();
    const spy = answer(ok({ id: "u", phone: "9876543210", name: "Asha Verma", createdAt: "" }));
    render(<NameForm initialName={null} />);
    await user.type(screen.getByLabelText(/Your name/), "  Asha Verma ");
    await user.click(screen.getByRole("button", { name: "Save name" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Name saved.");
    expect(screen.getByText("Asha Verma")).toBeInTheDocument();
    expect(spy.mock.calls[0][0]).toBe("/api/v1/me");
    expect(spy.mock.calls[0][1]).toMatchObject({ method: "PATCH" });
    expect(JSON.parse(String(spy.mock.calls[0][1]?.body))).toEqual({ name: "Asha Verma" });
    expect(router.refresh).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("edits a saved name, can cancel, and shows the API's field message", async () => {
    const user = userEvent.setup();
    answer(failure(400, "invalid_request", "Please check the highlighted fields.", { name: "Use 80 characters or fewer" }), failure(429, "rate_limited", "Too many requests. Try again in 30 seconds.", { retryAfterSeconds: 30 }));
    render(<NameForm initialName="Asha" />);
    await user.click(screen.getByRole("button", { name: "Edit your name" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Asha")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit your name" }));
    const input = screen.getByLabelText("Name");
    await user.clear(input);
    await user.type(input, "A");
    await user.click(screen.getByRole("button", { name: "Save name" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter your name");
    await user.type(input, "sha Rani");
    await user.click(screen.getByRole("button", { name: "Save name" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Use 80 characters or fewer"));
    expect(input).toHaveAttribute("aria-invalid", "true");
    await user.click(screen.getByRole("button", { name: "Save name" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Too many requests. Try again in 30 seconds."));
  });
});

describe("SignOutButton and DeleteAccount", () => {
  it("logs out and goes home; a failure is shown", async () => {
    const user = userEvent.setup();
    const spy = answer(failure(403, "forbidden", "This request must come from the Paint Saathi website."), ok({ signedOut: true }));
    render(<SignOutButton />);
    await user.click(screen.getByRole("button", { name: "Log out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This request must come from the Paint Saathi website.");
    await user.click(screen.getByRole("button", { name: "Log out" }));
    await waitFor(() => expect(nav.hardNavigate).toHaveBeenCalledWith("/"));
    expect(spy.mock.calls[1][0]).toBe("/api/v1/auth/logout");
    expect(spy.mock.calls[1][1]).toMatchObject({ method: "POST" });
  });

  it("deletes only after a confirm step, explaining that bookings stay with us", async () => {
    const user = userEvent.setup();
    const spy = answer(failure(500, "internal_error", "Something went wrong on our side. Please try again."), ok({ deleted: true }));
    render(<DeleteAccount />);
    expect(screen.getByText(/Your bookings stay with us for our records, but are no longer linked to an account/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete my account" }));
    const confirm = screen.getByRole("group", { name: "Delete your account? This cannot be undone." });
    await user.click(within(confirm).getByRole("button", { name: "Keep my account" }));
    expect(spy).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Delete my account" }));
    await user.click(screen.getByRole("button", { name: "Yes, delete my account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong on our side. Please try again.");
    await user.click(screen.getByRole("button", { name: "Yes, delete my account" }));
    await waitFor(() => expect(nav.hardNavigate).toHaveBeenCalledWith("/"));
    expect(spy.mock.calls[1]).toEqual(["/api/v1/me", expect.objectContaining({ method: "DELETE" })]);
  });
});

const summary = (over: Partial<ProjectSummary> = {}): ProjectSummary => ({
  id: "3f0c1a2b-1111-4222-8333-444455556666",
  service: "Interior Painting",
  city: "Agra",
  citySlug: "agra",
  locality: "Kamla Nagar",
  stage: "quotation_shared",
  stageLabel: "Quotation shared",
  createdAt: "2026-10-28T06:00:00.000Z",
  updatedAt: "2026-10-31T06:00:00.000Z",
  currency: "INR",
  ...over,
});

describe("ProjectCard and the empty state", () => {
  it("names the service and place, the stage and its explanation, the last update and the whole card links to the tracker", () => {
    render(<ProjectCard project={summary()} />);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Interior Painting");
    expect(screen.getByRole("link", { name: "Interior Painting" })).toHaveAttribute("href", "/account/projects/3f0c1a2b-1111-4222-8333-444455556666");
    expect(screen.getByText("Kamla Nagar, Agra")).toBeInTheDocument();
    expect(screen.getByText("Quotation shared")).toBeInTheDocument();
    expect(screen.getByText("Your itemised quotation is ready to review.")).toBeInTheDocument();
    expect(screen.getByText("Last update 31 Oct 2026")).toBeInTheDocument();
    expect(screen.getByText("Stage 5 of 9")).toBeInTheDocument();
    expect(screen.queryByText(/Final price/)).toBeNull();
  });

  it("shows the final price once a quotation is approved, and copes with missing details", () => {
    render(<ProjectCard project={summary({ service: null, locality: null, city: null, stage: "price_finalised", stageLabel: "Price finalised", finalPricePaise: 4_500_000 })} />);
    expect(screen.getByRole("link", { name: "House painting" })).toBeInTheDocument();
    expect(screen.getByText(/Final price/)).toHaveTextContent("Final price ₹45,000");
  });

  it("colours each kind of stage, and has no progress bar off the main line", () => {
    const tones = (["completed", "cancelled", "on_hold", "booked"] as const).map((s) => {
      const { container, unmount } = render(<StagePill stage={s} label={s} />);
      const cls = container.firstElementChild!.className;
      unmount();
      return cls;
    });
    expect(new Set(tones).size).toBe(4);
    expect(render(<StageProgress stage="on_hold" />).container.innerHTML).toBe("");
    const { container } = render(<StageProgress stage="completed" />);
    expect(container.querySelectorAll(".bg-sage-deep")).toHaveLength(9);
  });

  it("an empty account offers the booking form", () => {
    render(<ProjectsEmpty />);
    expect(screen.getByText("No projects yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book a free inspection" })).toHaveAttribute("href", "/book");
    for (const img of screen.queryAllByRole("img", { hidden: true })) expect(img).toHaveAttribute("alt", "");
  });
});

const quote = (over: Partial<Quotation> = {}): Quotation => ({
  id: "9a8b7c6d-1111-4222-8333-444455556666",
  version: 2,
  status: "sent",
  sentAt: "2026-10-31T06:30:00.000Z",
  approvedAt: null,
  validUntil: "2026-11-30",
  notes: "Furniture covered by our crew.",
  paymentTerms: "Half at the midpoint, the rest at handover.",
  lines: [
    { position: 1, item: "Living room walls", description: "Putty, primer, two coats", areaSqft: 1200, coats: 2, ratePaise: 1_850, amountPaise: 2_220_000 },
    { position: 2, item: "Main door", description: null, areaSqft: null, coats: 1, ratePaise: null, amountPaise: 150_000 },
  ],
  subtotalPaise: 2_370_000,
  totalPaise: 2_370_000,
  currency: "INR",
  pdf: "/api/v1/projects/p/quotations/q/pdf",
  ...over,
});

const detail = (over: Partial<ProjectDetail> = {}): ProjectDetail => {
  const timeline: ProjectDetail["timeline"] = [
    { stage: "booked", label: "Booking received", note: null, at: "2026-10-28T06:00:00.000Z" },
    { stage: "inspection_scheduled", label: "Inspection scheduled", note: null, at: "2026-10-29T06:00:00.000Z" },
    { stage: "quotation_shared", label: "Quotation shared", note: "Revised quotation (version 2).", at: "2026-10-31T06:30:00.000Z" },
  ];
  return {
    ...summary(),
    address: "12 Rose Villa, Nehru Road",
    pincode: "282005",
    stageExplanation: "Your itemised quotation is ready to review.",
    workStartsOn: null,
    stages: stageSteps("quotation_shared", timeline),
    timeline,
    inspection: { scheduledAt: "2026-11-04T06:00:00.000Z", visitedAt: "2026-11-04T07:00:00.000Z", inspectorName: "Ravi", findings: "Damp patch on the north wall.\nHairline cracks in the hall." },
    quotations: [quote(), quote({ id: "v1", version: 1, status: "superseded", notes: null, paymentTerms: null, validUntil: null })],
    ...over,
  };
};

describe("ProjectTracker", () => {
  it("shows where the project stands and what happens next", () => {
    render(<ProjectStatus project={detail()} />);
    expect(screen.getByRole("heading", { level: 2, name: "Quotation shared" })).toBeInTheDocument();
    expect(screen.getByText(/Nothing starts until you approve it, and there is no advance payment/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Final price" })).toBeNull();
  });

  it("highlights the final price once a quotation is approved, with its PDF", () => {
    const approved = quote({ status: "approved", approvedAt: "2026-11-02T05:00:00.000Z" });
    render(<ProjectStatus project={detail({ stage: "price_finalised", stageLabel: "Price finalised", quotations: [approved], finalPricePaise: approved.totalPaise })} />);
    const panel = screen.getByRole("region", { name: "Final price" });
    expect(panel).toHaveTextContent("₹23,700");
    expect(panel).toHaveTextContent("Quotation version 2, approved on 2 Nov 2026. This is the price for the work it lists.");
    expect(within(panel).getByRole("link", { name: /approved quotation/ })).toHaveAttribute("href", approved.pdf);
  });

  it("offers a new booking on a cancelled project", () => {
    render(<ProjectStatus project={detail({ stage: "cancelled", stageLabel: "Cancelled", stageExplanation: "This project was cancelled." })} />);
    expect(screen.getByRole("link", { name: "Book a new inspection" })).toHaveAttribute("href", "/book");
  });

  it("the stepper marks done, current and upcoming stages, with the dates reached", () => {
    const d = detail();
    render(<StageStepper steps={d.stages} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(9);
    expect(items[0]).toHaveTextContent("Done: Booking received");
    expect(items[0]).toHaveTextContent("28 Oct 2026");
    expect(items[1]).toHaveTextContent("Done: Visit being arranged");
    expect(items[4]).toHaveAttribute("aria-current", "step");
    expect(items[4]).toHaveTextContent("Current stage: Quotation shared");
    expect(items[8]).toHaveTextContent("Coming up: Handed over");
  });

  it("the stepper ends with the hold when a project is paused", () => {
    const steps = stageSteps("on_hold", [{ stage: "booked", at: "2026-10-28T06:00:00.000Z" }, { stage: "on_hold", at: "2026-10-30T06:00:00.000Z" }]);
    render(<StageStepper steps={steps} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(10);
    expect(items[9]).toHaveTextContent("Current stage: On hold");
  });

  it("the inspection card: visit, inspector, visited and findings; or not scheduled yet", () => {
    const { unmount } = render(<InspectionCard inspection={detail().inspection} />);
    expect(screen.getByText("Inspector").nextSibling).toHaveTextContent("Ravi");
    expect(screen.getByText("Visit").nextSibling).toHaveTextContent(/4 Nov/);
    expect(screen.getByText("Visited").nextSibling).toHaveTextContent("4 Nov 2026, 12:30 pm");
    expect(screen.getByText(/Damp patch on the north wall/)).toBeInTheDocument();
    unmount();
    const { unmount: u2 } = render(<InspectionCard inspection={{ scheduledAt: null, visitedAt: null, inspectorName: null, findings: null }} />);
    expect(screen.getByText("Visited").nextSibling).toHaveTextContent("Not yet");
    expect(screen.queryByText("Inspector")).toBeNull();
    u2();
    render(<InspectionCard inspection={null} />);
    expect(screen.getByText(/Not scheduled yet/)).toBeInTheDocument();
  });

  it("a quotation: status, dates, itemised lines with ₹ totals, notes, terms and the PDF download", () => {
    render(<QuotationCard quotation={quote()} latest />);
    expect(screen.getByRole("heading", { level: 3, name: "Quotation, version 2" })).toBeInTheDocument();
    expect(screen.getByText("For your review")).toBeInTheDocument();
    expect(screen.getByText("Sent 31 Oct 2026 · Valid until 30 Nov 2026")).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Quotation version 2, itemised" });
    expect(within(table).getAllByRole("columnheader").map((th) => th.textContent)).toEqual(["Item", "Area", "Coats", "Rate", "Amount"]);
    const rows = within(table).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Living room walls");
    expect(rows[1]).toHaveTextContent("1,200 sq ft");
    expect(rows[1]).toHaveTextContent("₹18.50");
    expect(rows[1]).toHaveTextContent("₹22,200");
    expect(rows[2]).toHaveTextContent("not given");
    expect(within(table).getByRole("rowheader", { name: "Total" }).nextSibling).toHaveTextContent("₹23,700");
    expect(screen.getByText("Half at the midpoint, the rest at handover.")).toBeInTheDocument();
    expect(screen.getByText(/To approve it or ask for changes, tell our team/)).toBeInTheDocument();
    const pdf = screen.getByRole("link", { name: "Download PDF, quotation version 2" });
    expect(pdf).toHaveAttribute("href", "/api/v1/projects/p/quotations/q/pdf");
    expect(pdf).toHaveAttribute("download", "Paint-Saathi-quotation-v2.pdf");
    expect(pdf.className).toContain("btn-primary");
  });

  it("an older version folds its lines away; the list is newest first, or says what will appear", () => {
    const { unmount } = render(<QuotationList quotations={detail().quotations} />);
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(["Quotation, version 2", "Quotation, version 1"]);
    expect(screen.getByText("Replaced by a newer version")).toBeInTheDocument();
    expect(screen.getByText(/Show the 2 lines · total ₹23,700/).closest("details")).not.toHaveAttribute("open");
    expect(screen.getByRole("link", { name: "Download PDF, quotation version 1" }).className).toContain("btn-secondary");
    unmount();
    const { unmount: u2 } = render(<QuotationCard quotation={quote({ status: "declined", lines: [quote().lines[0]], notes: null })} latest={false} />);
    expect(screen.getByText(/Show the 1 line ·/)).toBeInTheDocument();
    u2();
    render(<QuotationList quotations={[]} />);
    expect(screen.getByText(/Your itemised quotation appears here after the inspection/)).toBeInTheDocument();
  });

  it("the updates are newest first, with the team's notes", () => {
    const { unmount } = render(<ProjectTimeline events={detail().timeline} />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Quotation shared");
    expect(items[0]).toHaveTextContent("Revised quotation (version 2).");
    expect(items[2]).toHaveTextContent("Booking received");
    unmount();
    render(<ProjectTimeline events={[]} />);
    expect(screen.getByText("No updates yet.")).toBeInTheDocument();
  });

  it("help: the contact page always; call and WhatsApp only once site.ts has them", async () => {
    const { unmount } = render(<ProjectHelp />);
    expect(screen.getByRole("link", { name: "Contact page" })).toHaveAttribute("href", "/contact");
    expect(Boolean(screen.queryByRole("link", { name: /^Call/ }))).toBe(Boolean(site.phone));
    unmount();
    const Filled = await withFilledSite(fakeContact, async () => (await import("@/components/account/ProjectTracker")).ProjectHelp);
    const { unmount: u2 } = render(<Filled />);
    expect(screen.getByRole("link", { name: `Call ${fakeContact.phoneDisplay}` })).toHaveAttribute("href", `tel:${fakeContact.phone}`);
    expect(screen.getByRole("link", { name: "Chat on WhatsApp" })).toHaveAttribute("href", `https://wa.me/${fakeContact.whatsapp}`);
    u2();
    const Bare = await withFilledSite({ phone: fakeContact.phone }, async () => (await import("@/components/account/ProjectTracker")).ProjectHelp);
    render(<Bare />);
    expect(screen.getByRole("link", { name: `Call ${fakeContact.phone}` })).toBeInTheDocument();
  });

  it("puts it all together with headings in order", () => {
    const { container } = render(
      <>
        <h1>Interior Painting in Kamla Nagar</h1>
        <ProjectTracker project={detail()} />
      </>,
    );
    const levels = [...container.querySelectorAll("h1, h2, h3, h4")].map((h) => Number(h.tagName[1]));
    levels.forEach((level, i) => {
      if (i > 0) expect(level).toBeLessThanOrEqual(levels[i - 1] + 1);
    });
    expect(screen.getByRole("heading", { level: 2, name: "Your progress" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Site inspection" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Your quotation" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Updates from our team" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Need help?" })).toBeInTheDocument();
  });
});
