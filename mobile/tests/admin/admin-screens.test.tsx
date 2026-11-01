import { fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { router } from "expo-router";
import { File } from "expo-file-system";
import { Alert, Linking, type AlertButton } from "react-native";

import { AdminLeads } from "~/components/admin/AdminLeads";
import { AdminLogin } from "~/components/admin/AdminLogin";
import { AdminProject } from "~/components/admin/AdminProject";
import { AdminProjects } from "~/components/admin/AdminProjects";
import { AdminProvider } from "~/lib/admin-context";
import { STAGE_LABELS } from "~/shared";
import { adminProject, lead, leadsMeta, mockAdminApi, offline, PID, projectRow, projectsMeta, quotation, savedAdmin, seedAdmin, type AdminAnswer } from "./helpers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  usePathname: jest.fn(() => "/admin"),
  useLocalSearchParams: jest.fn(() => ({})),
}));

const download = File.downloadFileAsync as unknown as jest.Mock;
const QID = quotation().id;

/** Answers the next Alert with the button named `choice`. */
const answerAlert = (choice: string) => jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons?: AlertButton[]) => buttons?.find((b) => b.text === choice)?.onPress?.());

async function choose(select: string, option: string) {
  await fireEvent.press(screen.getByRole("button", { name: select }));
  await fireEvent.press(within(screen.getByTestId("select-sheet")).getByRole("button", { name: option }));
}

async function pickDay(field: string, day: Date) {
  await fireEvent.press(screen.getByRole("button", { name: field }));
  await fireEvent(screen.getByTestId("date-picker"), "valueChange", { type: "set" }, day);
  await fireEvent.press(screen.getByRole("button", { name: "Done" }));
}

beforeEach(() => jest.clearAllMocks());

describe("the admin sign-in screen", () => {
  async function show() {
    await render(
      <AdminProvider>
        <AdminLogin />
      </AdminProvider>,
    );
  }

  it("signs in with the admin username and password and opens the leads", async () => {
    const calls = mockAdminApi({ "POST /api/admin/session": { data: { username: "owner", token: "fresh", expiresAt: new Date(Date.now() + 3_600_000).toISOString() } } });
    await show();
    const username = screen.getByLabelText("Username");
    // phones would otherwise turn "owner" into "Owner"
    expect(username.props).toMatchObject({ autoCapitalize: "none", autoCorrect: false, textContentType: "username" });
    expect(screen.getByLabelText("Password").props).toMatchObject({ secureTextEntry: true, textContentType: "password" });
    await fireEvent.changeText(username, "owner");
    await fireEvent(username, "submitEditing");
    await fireEvent.changeText(screen.getByLabelText("Password"), "a-long-password");
    await fireEvent(screen.getByLabelText("Password"), "submitEditing");
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/admin"));
    expect(calls[0].body).toEqual({ username: "owner", password: "a-long-password" });
    expect(JSON.parse(savedAdmin()!).token).toBe("fresh");
  });

  it("asks for both fields, then shows the API's refusal", async () => {
    mockAdminApi({ "POST /api/admin/session": { status: 401, error: { code: "invalid_credentials", message: "Incorrect username or password." } } });
    await show();
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter your username and password.");
    await fireEvent.changeText(screen.getByLabelText("Username"), "owner");
    await fireEvent.changeText(screen.getByLabelText("Password"), "wrong");
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Incorrect username or password.")).toBeOnTheScreen();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("goes straight to the leads when already signed in, and back to the customer login", async () => {
    seedAdmin();
    await show();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/admin"));
    await fireEvent.press(screen.getByRole("link", { name: "Customer log in" }));
    expect(router.replace).toHaveBeenCalledWith("/login");
  });
});

describe("the leads screen", () => {
  async function show(routes: Record<string, AdminAnswer | AdminAnswer[]>, signedIn = true) {
    if (signedIn) seedAdmin();
    const calls = mockAdminApi(routes);
    await render(
      <AdminProvider>
        <AdminLeads />
      </AdminProvider>,
    );
    return calls;
  }

  it("opens the admin sign-in when signed out", async () => {
    await show({}, false);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/admin/login"));
  });

  it("shows the counts and each lead: who, when, how to call, the job, the status and the project", async () => {
    const calls = await show({ "GET /api/admin/leads": { data: [lead(), lead({ id: "l2", type: "contact", name: "Ravi", channel: "web", message: "Do you paint grills?", projectId: null, address: "", jobSize: "", crew: "", propertyType: "", service: "", preferredDate: "" })], meta: leadsMeta() } });
    expect(await screen.findByLabelText("Total leads: 2")).toBeOnTheScreen();
    expect(screen.getByLabelText("Inspection bookings: 1")).toBeOnTheScreen();
    expect(screen.getByLabelText("Messages: 1")).toBeOnTheScreen();
    expect(screen.getByLabelText("Status: New: 2")).toBeOnTheScreen();
    expect(calls[0].headers.Authorization).toBe("Bearer admin-token");
    expect(calls[0].search.get("perPage")).toBe("20");
    expect(screen.getByRole("header", { name: "Asha Verma" })).toBeOnTheScreen();
    expect(screen.getByText("Booking")).toBeOnTheScreen();
    expect(screen.getByLabelText("Address: 12 Rose Villa, Kamla Nagar, Agra 282005")).toBeOnTheScreen();
    expect(screen.getByLabelText("Source: App · Direct")).toBeOnTheScreen();
    expect(screen.getByLabelText("Message: Do you paint grills?")).toBeOnTheScreen();
    expect(screen.getByLabelText("Source: Direct")).toBeOnTheScreen();
    expect(screen.getByText("2 leads")).toBeOnTheScreen();
    const call = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    await fireEvent.press(screen.getByRole("link", { name: "Call Asha Verma, 9876543210" }));
    expect(call).toHaveBeenCalledWith("tel:+919876543210");
    await fireEvent.press(screen.getByRole("link", { name: "Open project" }));
    expect(router.push).toHaveBeenCalledWith(`/admin/projects/${PID}`);
  });

  it("filters by type, city and status and searches after a pause, then clears the filters", async () => {
    const calls = await show({ "GET /api/admin/leads": { data: [lead()], meta: leadsMeta() } });
    await screen.findByRole("header", { name: "Asha Verma" });
    await choose("Lead type", "Bookings");
    await waitFor(() => expect(calls.at(-1)!.search.get("type")).toBe("booking"));
    await choose("City", "Mathura");
    await waitFor(() => expect(calls.at(-1)!.search.get("city")).toBe("Mathura"));
    await choose("Status", "Called");
    await waitFor(() => expect(calls.at(-1)!.search.get("status")).toBe("called"));
    await fireEvent.changeText(screen.getByLabelText("Search leads"), " asha ");
    await waitFor(() => expect(calls.at(-1)!.search.get("q")).toBe("asha"), { timeout: 2000 });
    await fireEvent.press(await screen.findByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect([...calls.at(-1)!.search.keys()]).toEqual(["page", "perPage"]));
  });

  it("saves a new status at once, and says when it could not", async () => {
    const calls = await show({
      "GET /api/admin/leads": { data: [lead()], meta: leadsMeta() },
      [`PATCH /api/admin/leads/${lead().id}`]: [{ data: { status: "called", statusLabel: "Called" } }, { status: 500, error: { code: "internal_error", message: "Something went wrong on our side." } }],
    });
    await screen.findByRole("header", { name: "Asha Verma" });
    await choose("Status of Asha Verma", "Called");
    await waitFor(() => expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({ status: "called" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Status of Asha Verma" })).toHaveAccessibilityValue({ text: "Called" }));
    await choose("Status of Asha Verma", "Spam");
    expect(await screen.findByText("Not saved: Something went wrong on our side.")).toBeOnTheScreen();
  });

  it("shows twenty at a time with Show more", async () => {
    const calls = await show({
      "GET /api/admin/leads": [
        { data: [lead()], meta: leadsMeta({ total: 2, pages: 2 }) },
        { data: [lead({ id: "l2", name: "Meena" })], meta: leadsMeta({ total: 2, page: 2, pages: 2 }) },
      ],
    });
    await screen.findByRole("header", { name: "Asha Verma" });
    await fireEvent.press(screen.getByRole("button", { name: "Show more" }));
    expect(await screen.findByRole("header", { name: "Meena" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Asha Verma" })).toBeOnTheScreen();
    expect(calls.at(-1)!.search.get("page")).toBe("2");
    expect(screen.queryByRole("button", { name: "Show more" })).toBeNull();
  });

  it("says when there are no leads yet, or none match", async () => {
    await show({ "GET /api/admin/leads": [{ data: [], meta: leadsMeta({ total: 0, stats: { total: 0, bookings: 0, messages: 0, new: 0 }, options: { cities: [], statuses: [] } }) }, { data: [], meta: leadsMeta({ total: 0 }) }] });
    expect(await screen.findByText("No leads yet. Bookings from the website and the app appear here as they arrive.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "City" })).toBeNull();
    await choose("Lead type", "Messages");
    expect(await screen.findByText("No leads match these filters.")).toBeOnTheScreen();
    expect(screen.getByText("0 of 2 shown")).toBeOnTheScreen();
  });

  it("says why the leads could not load, with Try again", async () => {
    // a read is tried twice before it fails
    await show({ "GET /api/admin/leads": [offline, offline, { data: [lead()], meta: leadsMeta() }] });
    expect(await screen.findByText("Couldn't load leads")).toBeOnTheScreen();
    expect(screen.getByText("Network error. Please check your connection and try again.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("header", { name: "Asha Verma" })).toBeOnTheScreen();
  });

  it("switches to Projects, refreshes, and signs out", async () => {
    const calls = await show({ "GET /api/admin/leads": { data: [lead()], meta: leadsMeta() } });
    await screen.findByRole("header", { name: "Asha Verma" });
    expect(screen.getByText("Signed in as owner", { exact: false })).toBeOnTheScreen();
    expect(screen.getByRole("tab", { name: "Leads" })).toBeSelected();
    await fireEvent.press(screen.getByRole("tab", { name: "Leads" }));
    expect(router.navigate).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("tab", { name: "Projects" }));
    expect(router.navigate).toHaveBeenCalledWith("/admin/projects");
    const before = calls.length;
    await fireEvent.press(screen.getByRole("link", { name: "Refresh" }));
    await waitFor(() => expect(calls.length).toBe(before + 1));
    await fireEvent.press(screen.getByRole("button", { name: "Sign out" }));
    expect(router.replace).toHaveBeenCalledWith("/admin/login");
    await waitFor(() => expect(savedAdmin()).toBeUndefined());
  });
});

describe("the projects screen", () => {
  async function show(routes: Record<string, AdminAnswer | AdminAnswer[]>) {
    seedAdmin();
    const calls = mockAdminApi(routes);
    await render(
      <AdminProvider>
        <AdminProjects />
      </AdminProvider>,
    );
    return calls;
  }

  it("lists the projects with stage, place, last update and final price; each opens its project", async () => {
    await show({ "GET /api/admin/projects": { data: [projectRow({ finalPricePaise: 9_240_000 })], meta: projectsMeta() } });
    const open = await screen.findByRole("link", { name: "Asha Verma, Quotation shared" });
    expect(within(open).getByText("Interior Painting · Kamla Nagar, Agra")).toBeOnTheScreen();
    expect(within(open).getByText(/Final price ₹92,400/)).toBeOnTheScreen();
    expect(screen.getByText("1 project")).toBeOnTheScreen();
    await fireEvent.press(open);
    expect(router.push).toHaveBeenCalledWith(`/admin/projects/${PID}`);
    const call = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    await fireEvent.press(screen.getByRole("link", { name: "Call Asha Verma, 9876543210" }));
    expect(call).toHaveBeenCalledWith("tel:+919876543210");
  });

  it("filters by stage and city and searches, with Show more and Clear filters", async () => {
    const calls = await show({
      "GET /api/admin/projects": [
        { data: [projectRow({ service: null, locality: null, city: null })], meta: projectsMeta({ total: 2, pages: 2 }) },
        { data: [projectRow({ id: "p2", name: "Meena" })], meta: projectsMeta({ total: 2, page: 2, pages: 2 }) },
        { data: [], meta: projectsMeta({ total: 0 }) },
      ],
    });
    expect(await screen.findByText("Painting")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Show more" }));
    expect(await screen.findByRole("link", { name: "Meena, Quotation shared" })).toBeOnTheScreen();
    await choose("Stage", STAGE_LABELS.on_hold);
    await waitFor(() => expect(calls.at(-1)!.search.get("stage")).toBe("on_hold"));
    expect(await screen.findByText("No projects match these filters.")).toBeOnTheScreen();
    await choose("City", "Mathura");
    await waitFor(() => expect(calls.at(-1)!.search.get("city")).toBe("mathura"));
    await fireEvent.changeText(screen.getByLabelText("Search projects by name or phone"), "98765");
    await waitFor(() => expect(calls.at(-1)!.search.get("q")).toBe("98765"), { timeout: 2000 });
    await fireEvent.press(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect([...calls.at(-1)!.search.keys()]).toEqual(["page", "perPage"]));
  });

  it("says when there are no projects yet, and why they could not load", async () => {
    await show({ "GET /api/admin/projects": [{ data: [], meta: projectsMeta({ total: 0 }) }, { status: 503, error: { code: "database_unavailable", message: "Accounts are not available right now." } }] });
    expect(await screen.findByText("No projects yet. Every booking opens one, in “Booking received”.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Refresh" }));
    expect(await screen.findByText("Couldn't load projects")).toBeOnTheScreen();
    expect(screen.getByText("Accounts are not available right now.")).toBeOnTheScreen();
  });
});

describe("the project screen", () => {
  const path = `GET /api/admin/projects/${PID}`;
  async function show(routes: Record<string, AdminAnswer | AdminAnswer[]>) {
    seedAdmin();
    const calls = mockAdminApi(routes);
    await render(
      <AdminProvider>
        <AdminProject id={PID} />
      </AdminProvider>,
    );
    return calls;
  }

  it("shows the customer, the address with its map pin, and the job", async () => {
    await show({ [path]: { data: adminProject({ finalPricePaise: 1_000_000 }) } });
    expect(await screen.findByRole("header", { name: "Asha Verma" })).toBeOnTheScreen();
    expect(screen.getByText(/Final price ₹10,000/)).toBeOnTheScreen();
    expect(screen.getByLabelText("Address: 12 Rose Villa, Kamla Nagar, Agra 282005")).toBeOnTheScreen();
    expect(screen.getByLabelText("Account: Signed in: sees this project on their tracker")).toBeOnTheScreen();
    expect(screen.getByLabelText("Job size: 1 floor · 2 BHK · 900 sq ft/floor")).toBeOnTheScreen();
    expect(screen.getByLabelText("Notes: Please call before coming.")).toBeOnTheScreen();
    expect(screen.getByLabelText(/^Booked: .* · App$/)).toBeOnTheScreen();
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    await fireEvent.press(screen.getByRole("link", { name: "Open in Google Maps" }));
    expect(open).toHaveBeenCalledWith("https://maps.google.com/?q=27.2,78");
    await fireEvent.press(screen.getByRole("link", { name: "Call Asha Verma, 9876543210" }));
    expect(open).toHaveBeenCalledWith("tel:+919876543210");
    await fireEvent.press(screen.getByRole("link", { name: "All projects" }));
    expect(router.navigate).toHaveBeenCalledWith("/admin/projects");
  });

  it("falls back to the booking's details and says what is missing", async () => {
    await show({ [path]: { data: adminProject({ address: null, userId: null, location: null, propertyType: null, floors: null, homeSize: null, carpetArea: null, preferredDate: null, notes: null, service: null, lead: { ...adminProject().lead!, source: "web", floors: "2", message: "Gate code 12" } }) } });
    expect(await screen.findByLabelText(/house and street not added yet/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/Not signed in yet/)).toBeOnTheScreen();
    expect(screen.getByLabelText("Job size: 2 floors")).toBeOnTheScreen();
    expect(screen.getByLabelText("Notes: Gate code 12")).toBeOnTheScreen();
    expect(screen.getByLabelText("Service: —")).toBeOnTheScreen();
    expect(screen.queryByRole("link", { name: "Open in Google Maps" })).toBeNull();
  });

  it("moves the stage with a note for the customer, or posts an update on the current stage", async () => {
    const calls = await show({ [path]: { data: adminProject() }, [`POST /api/admin/projects/${PID}/stage`]: { data: { id: PID } } });
    await screen.findByRole("header", { name: "Asha Verma" });
    expect(screen.getByText("Customer sees: “Your itemised quotation is ready to review.”")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Post update" })).toBeDisabled();
    await choose("Set stage", `Off the line: ${STAGE_LABELS.on_hold}`);
    await fireEvent.changeText(screen.getByLabelText("Note for the customer"), "Paused for Diwali");
    await fireEvent.press(screen.getByRole("button", { name: "Update stage" }));
    expect(await screen.findByText(`Moved to “${STAGE_LABELS.on_hold}”.`)).toBeOnTheScreen();
    expect(calls.find((c) => c.method === "POST")?.body).toEqual({ stage: "on_hold", note: "Paused for Diwali" });
    expect(screen.getByLabelText("Note for the customer").props.value).toBe("");
    // the project is read again after a change
    expect(calls.filter((c) => c.path === `/api/admin/projects/${PID}` && c.method === "GET").length).toBe(2);
  });

  it("follows the stage when it moves on its own, and posts a progress update", async () => {
    const calls = await show({
      [path]: [{ data: adminProject() }, { data: adminProject({ stage: "price_finalised", stageLabel: STAGE_LABELS.price_finalised }) }],
      [`POST /api/admin/projects/${PID}/stage`]: { data: { id: PID } },
    });
    await screen.findByRole("header", { name: "Asha Verma" });
    await fireEvent.changeText(screen.getByLabelText("Note for the customer"), "Walls primed");
    await fireEvent.press(screen.getByRole("button", { name: "Post update" }));
    expect(await screen.findByText("Update posted.")).toBeOnTheScreen();
    expect(calls.find((c) => c.method === "POST")?.body).toEqual({ stage: "quotation_shared", note: "Walls primed" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Set stage" })).toHaveAccessibilityValue({ text: `${STAGE_LABELS.price_finalised} (current)` }));
  });

  it("saves and clears the crew's start date", async () => {
    const calls = await show({
      [path]: [{ data: adminProject() }, { data: adminProject({ workStartsOn: "2026-11-05" }) }],
      [`PUT /api/admin/projects/${PID}/work-start`]: { data: { id: PID } },
    });
    await screen.findByRole("header", { name: "Asha Verma" });
    expect(screen.getByRole("button", { name: "Save date" })).toBeDisabled();
    await pickDay("Work start date", new Date(2026, 10, 5));
    await fireEvent.press(screen.getByRole("button", { name: "Save date" }));
    expect(await screen.findByText("Start date saved.")).toBeOnTheScreen();
    expect(calls.find((c) => c.method === "PUT")?.body).toEqual({ workStartsOn: "2026-11-05" });
    await fireEvent.press(await screen.findByRole("button", { name: "Clear" }));
    expect(await screen.findByText("Start date cleared.")).toBeOnTheScreen();
    expect(calls.filter((c) => c.method === "PUT").at(-1)?.body).toEqual({ workStartsOn: null });
  });

  it("schedules the inspection in India time, then records the visit and findings", async () => {
    const calls = await show({
      [path]: [{ data: adminProject() }, { data: adminProject({ inspection: { scheduledAt: "2026-11-04T05:30:00.000Z", visitedAt: "2026-11-04T06:00:00.000Z", inspectorName: "Manu", findings: "Damp near the balcony." } }) }],
      [`PUT /api/admin/projects/${PID}/inspection`]: { data: { id: PID } },
      [`POST /api/admin/projects/${PID}/inspection/visit`]: { data: { id: PID } },
    });
    await screen.findByRole("header", { name: "Asha Verma" });
    expect(screen.getByText("Not scheduled yet.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Schedule inspection" }));
    expect(screen.getByText("Choose the inspection date.")).toBeOnTheScreen();
    await pickDay("Inspection date", new Date(2026, 10, 4));
    await fireEvent.changeText(screen.getByLabelText("Inspection time, 24-hour"), "9:30");
    await fireEvent.press(screen.getByRole("button", { name: "Schedule inspection" }));
    expect(screen.getByText("Enter the time as 24-hour HH:MM, e.g. 11:00 or 16:30.")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Inspection time, 24-hour"), "11:00");
    await fireEvent.changeText(screen.getByLabelText("Inspector"), "Manu");
    await fireEvent.press(screen.getByRole("button", { name: "Schedule inspection" }));
    expect(await screen.findByText("Inspection scheduled.")).toBeOnTheScreen();
    expect(calls.find((c) => c.method === "PUT")?.body).toEqual({ scheduledAt: "2026-11-04T11:00:00+05:30", inspectorName: "Manu" });
    expect(await screen.findByText(/Scheduled for .* · Visited .* · Inspector: Manu/)).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Findings"), "Damp near the balcony; treat first.");
    await fireEvent.press(screen.getByRole("button", { name: "Save findings" }));
    expect(await screen.findByText("Findings saved.")).toBeOnTheScreen();
    expect(calls.find((c) => c.path.endsWith("/visit"))?.body).toEqual({ findings: "Damp near the balcony; treat first.", visitedAt: "2026-11-04T06:00:00.000Z" });
  });

  it("marks the first visit and says when an action fails", async () => {
    const calls = await show({
      [path]: { data: adminProject() },
      [`POST /api/admin/projects/${PID}/inspection/visit`]: [{ status: 409, error: { code: "invalid_state", message: "The project is cancelled." } }, { data: { id: PID } }],
    });
    await screen.findByRole("header", { name: "Asha Verma" });
    await fireEvent.press(screen.getByRole("button", { name: "Mark visited" }));
    expect(await screen.findByText("The project is cancelled.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Mark visited" }));
    expect(await screen.findByText("Marked visited.")).toBeOnTheScreen();
    expect(calls.filter((c) => c.path.endsWith("/visit")).at(-1)?.body).toEqual({ findings: "" });
  });

  it("lists every update newest first with what the customer was shown", async () => {
    await show({ [path]: [{ data: adminProject() }, { data: adminProject({ timeline: [] }) }] });
    expect(await screen.findByText("Customer sees: Revised after the visit.")).toBeOnTheScreen();
    // the stage panel names the current stage first; in the timeline the newest comes before the oldest
    const labels = screen.getAllByText(/^(Booking received|Quotation shared)$/).map((n) => n.props.children);
    expect(labels.lastIndexOf("Quotation shared")).toBeLessThan(labels.indexOf("Booking received"));
    await fireEvent.press(screen.getByRole("link", { name: "Refresh" }));
    expect(await screen.findByText("No events yet.")).toBeOnTheScreen();
  });

  it("says when the project does not exist or could not load", async () => {
    await show({ [path]: [{ status: 404, error: { code: "not_found", message: "No such project." } }, offline] });
    expect(await screen.findByText("No such project")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Couldn't load this project")).toBeOnTheScreen();
  });
});

describe("quotations on the project screen", () => {
  const path = `GET /api/admin/projects/${PID}`;
  const base = `/api/admin/projects/${PID}/quotations`;
  async function show(routes: Record<string, AdminAnswer | AdminAnswer[]>) {
    seedAdmin();
    const calls = mockAdminApi(routes);
    await render(
      <AdminProvider>
        <AdminProject id={PID} />
      </AdminProvider>,
    );
    await screen.findByRole("header", { name: "Asha Verma" });
    return calls;
  }

  it("starts the first version when there is none", async () => {
    const calls = await show({
      [path]: [{ data: adminProject({ quotations: [] }) }, { data: adminProject({ quotations: [quotation({ id: "new", status: "draft", lines: [], totalPaise: 0, subtotalPaise: 0, notes: null, paymentTerms: null, validUntil: null })] }) }],
      [`POST ${base}`]: { status: 201, data: { id: "new", version: 1 } },
    });
    expect(screen.getByText(/No quotation yet/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Start quotation" }));
    expect(await screen.findByText("Version 1 started.")).toBeOnTheScreen();
    expect(calls.find((c) => c.method === "POST")?.body).toBeUndefined();
    expect(await screen.findByRole("header", { name: "Version 1: Draft" })).toBeOnTheScreen();
    // a new draft opens with one blank line
    expect(screen.getByLabelText("Line 1 item").props.value).toBe("");
  });

  it("shows a sent version's reference and payment milestones", async () => {
    await show({ [path]: { data: adminProject({ quotations: [quotation({ reference: "PS-3F0C2B1A-V1", paymentSchedule: [{ label: "At handover", percent: 100, amountPaise: 1_000_000 }] })] }) } });
    expect(screen.getByText("PS-3F0C2B1A-V1")).toBeOnTheScreen();
    expect(screen.getByLabelText("At handover: 100%, ₹10,000")).toBeOnTheScreen();
  });

  it("shows a sent version and records the customer's answer after a confirm", async () => {
    const calls = await show({
      [path]: { data: adminProject({ quotations: [quotation({ version: 2 }), quotation({ id: "old", version: 1, status: "superseded", notes: null, paymentTerms: null, validUntil: null })] }) },
      [`POST ${base}/${QID}/status`]: { data: { id: QID } },
    });
    expect(screen.getByRole("header", { name: "Version 2: Sent" })).toBeOnTheScreen();
    expect(screen.getByText("Living room walls")).toBeOnTheScreen();
    expect(screen.getByText("Royale Matt")).toBeOnTheScreen();
    expect(screen.getByText("Payment terms:", { exact: false })).toBeOnTheScreen();
    expect(screen.getByText("Valid until Wed 18 Nov 2026")).toBeOnTheScreen();
    answerAlert("Cancel");
    await fireEvent.press(screen.getByRole("button", { name: "Mark approved" }));
    expect(calls.some((c) => c.method === "POST")).toBe(false);
    answerAlert("Mark approved");
    await fireEvent.press(screen.getByRole("button", { name: "Mark approved" }));
    expect(await screen.findByText("Version 2 approved: the price is final.")).toBeOnTheScreen();
    expect(calls.find((c) => c.method === "POST")?.body).toEqual({ status: "approved" });
    answerAlert("Mark declined");
    await fireEvent.press(screen.getByRole("button", { name: "Mark declined" }));
    expect(await screen.findByText("Version 2 marked declined.")).toBeOnTheScreen();
    // an older version opens read-only, without the answer buttons
    await fireEvent.press(screen.getByRole("link", { name: /Version 1 · Superseded/ }));
    expect(screen.getByRole("header", { name: "Version 1: Superseded" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Mark approved" })).toBeNull();
  });

  it("starts a new version as a copy of the latest", async () => {
    const calls = await show({ [path]: { data: adminProject() }, [`POST ${base}`]: { status: 201, data: { id: "v2", version: 2 } } });
    await fireEvent.press(screen.getByRole("button", { name: "New version (copy of v1)" }));
    expect(await screen.findByText("Version 2 started from version 1.")).toBeOnTheScreen();
    expect(calls.some((c) => c.method === "POST" && c.path === base)).toBe(true);
  });

  it("previews the PDF as staff see it, and says when it cannot", async () => {
    await show({ [path]: { data: adminProject() } });
    await fireEvent.press(screen.getByRole("button", { name: "Preview PDF" }));
    await waitFor(() => expect(download).toHaveBeenCalledWith(expect.stringContaining(`${base}/${QID}/pdf`), expect.anything(), expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer admin-token" }) })));
    download.mockRejectedValueOnce(new Error("Unable to download file: HTTP 404"));
    await fireEvent.press(screen.getByRole("button", { name: "Preview PDF" }));
    expect(await screen.findByText("This quotation is no longer available. Open the project again to see the latest version.")).toBeOnTheScreen();
  });

  describe("the draft editor", () => {
    const draft = quotation({ status: "draft", version: 2, sentAt: null });
    const routes = (more: Record<string, AdminAnswer | AdminAnswer[]> = {}) => ({ [path]: { data: adminProject({ quotations: [draft, quotation({ id: "v1", version: 1 })] }) }, ...more });

    it("fills the amount from area × rate, adds, moves and removes lines, and shows the live total", async () => {
      await show(routes());
      expect(screen.getByRole("header", { name: "Version 2: Draft" })).toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: /New version/ })).toBeNull();
      expect(screen.getByLabelText("Line 1 amount in rupees").props.value).toBe("10000");
      await fireEvent.press(screen.getByRole("button", { name: "Add line" }));
      await fireEvent.changeText(screen.getByLabelText("Line 2 item"), "Ceiling");
      await fireEvent.changeText(screen.getByLabelText("Line 2 area in square feet"), "200");
      await fireEvent.changeText(screen.getByLabelText("Line 2 rate in rupees per square foot"), "15");
      expect(screen.getByLabelText("Line 2 amount in rupees").props.value).toBe("3000");
      expect(screen.getByText("₹13,000")).toBeOnTheScreen();
      expect(screen.getByText("Unsaved changes")).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole("button", { name: "Move line 2 up" }));
      expect(screen.getByLabelText("Line 1 item").props.value).toBe("Ceiling");
      await fireEvent.press(screen.getByRole("button", { name: "Move line 1 down" }));
      expect(screen.getByLabelText("Line 2 item").props.value).toBe("Ceiling");
      await fireEvent.press(screen.getByRole("button", { name: "Remove line 2" }));
      expect(screen.queryByLabelText("Line 2 item")).toBeNull();
      expect(screen.getByRole("button", { name: "Preview PDF (last saved)" })).toBeOnTheScreen();
    });

    it("lists what to fix before saving, then saves the draft", async () => {
      const calls = await show(routes({ [`PUT ${base}/${QID}`]: { data: { id: QID } } }));
      await fireEvent.changeText(screen.getByLabelText("Line 1 item"), "");
      await fireEvent.changeText(screen.getByLabelText("Line 1 coats"), "x");
      await fireEvent.press(screen.getByRole("button", { name: "Save draft" }));
      // under the field and in the list above the buttons
      expect(screen.getAllByText("Line 1: name the room or item.")).toHaveLength(2);
      expect(screen.getAllByText("Line 1: coats is a whole number up to 10.")).toHaveLength(2);
      expect(calls.some((c) => c.method === "PUT")).toBe(false);
      await fireEvent.changeText(screen.getByLabelText("Line 1 item"), "Living room walls");
      await fireEvent.changeText(screen.getByLabelText("Line 1 coats"), "2");
      await fireEvent.changeText(screen.getByLabelText("Notes"), "Furniture covered.");
      await fireEvent.changeText(screen.getByLabelText("Payment terms"), "Nothing before work starts.");
      await pickDay("Valid until", new Date(2026, 10, 20));
      await fireEvent.press(screen.getByRole("button", { name: "Save draft" }));
      expect(await screen.findByText("Draft saved.")).toBeOnTheScreen();
      expect(calls.find((c) => c.method === "PUT")?.body).toEqual({
        lines: [{ item: "Living room walls", description: "Royale Matt", areaSqft: 400, coats: 2, ratePaise: 2500, amountPaise: 1_000_000 }],
        notes: "Furniture covered.",
        paymentTerms: "Nothing before work starts.",
        // this draft has no milestones: an empty list keeps it that way
        paymentSchedule: [],
        validUntil: "2026-11-20",
      });
      expect(screen.queryByText("Unsaved changes")).toBeNull();
    });

    it("sends the draft to the customer after a confirm: saved first, then shared", async () => {
      const calls = await show(routes({ [`PUT ${base}/${QID}`]: { data: { id: QID } }, [`POST ${base}/${QID}/status`]: { data: { id: QID } } }));
      answerAlert("Cancel");
      await fireEvent.press(screen.getByRole("button", { name: "Send to customer" }));
      expect(calls.some((c) => c.method === "PUT")).toBe(false);
      answerAlert("Send");
      await fireEvent.press(screen.getByRole("button", { name: "Send to customer" }));
      expect(await screen.findByText("Version 2 sent to the customer.")).toBeOnTheScreen();
      const writes = calls.filter((c) => c.method !== "GET").map((c) => `${c.method} ${c.path}`);
      expect(writes).toEqual([`PUT ${base}/${QID}`, `POST ${base}/${QID}/status`]);
      expect(calls.find((c) => c.path.endsWith("/status"))?.body).toEqual({ status: "sent" });
    });

    it("edits the payment milestones: live amounts, add, remove, the standard ones, and a total that must be 100%", async () => {
      const withSchedule = quotation({ status: "draft", version: 2, sentAt: null, paymentSchedule: [{ label: "At start", percent: 50, amountPaise: 500_000 }, { label: "At handover", percent: 50, amountPaise: 500_000 }] });
      const calls = await show({ [path]: { data: adminProject({ quotations: [withSchedule] }) }, [`PUT ${base}/${QID}`]: { data: { id: QID } } });
      expect(screen.getByLabelText("Milestone 1: when it is due").props.value).toBe("At start");
      expect(screen.getAllByText("₹5,000")).toHaveLength(2);
      expect(screen.getByText("Adds up to 100%")).toBeOnTheScreen();
      await fireEvent.changeText(screen.getByLabelText("Milestone 2: share in percent"), "30");
      expect(screen.getByText("Adds up to 80%")).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole("button", { name: "Save draft" }));
      expect(screen.getAllByText("The payment milestones must add up to 100% (now 80%).").length).toBeGreaterThan(0);
      expect(calls.some((c) => c.method === "PUT")).toBe(false);
      await fireEvent.press(screen.getByRole("button", { name: "Add milestone" }));
      await fireEvent.changeText(screen.getByLabelText("Milestone 3: when it is due"), "After the inspection");
      await fireEvent.changeText(screen.getByLabelText("Milestone 3: share in percent"), "20");
      await fireEvent.press(screen.getByRole("button", { name: "Save draft" }));
      expect(await screen.findByText("Draft saved.")).toBeOnTheScreen();
      expect((calls.find((c) => c.method === "PUT")?.body as { paymentSchedule: unknown }).paymentSchedule).toEqual([
        { label: "At start", percent: 50 },
        { label: "At handover", percent: 30 },
        { label: "After the inspection", percent: 20 },
      ]);
      await fireEvent.press(screen.getByRole("button", { name: "Remove milestone 3" }));
      await fireEvent.press(screen.getByRole("button", { name: "Remove milestone 2" }));
      await fireEvent.press(screen.getByRole("button", { name: "Remove milestone 1" }));
      expect(screen.getByText("No milestones: the PDF shows only the payment terms below.")).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole("button", { name: "Use the standard milestones" }));
      expect(screen.getByLabelText("Milestone 1: when it is due").props.value).toBe("On the first day of work, when the materials arrive");
      await fireEvent.changeText(screen.getByLabelText("Milestone 1: when it is due"), "");
      await fireEvent.press(screen.getByRole("button", { name: "Save draft" }));
      expect(screen.getAllByText("Milestone 1: say when it is due.").length).toBeGreaterThan(0);
    });

    it("will not send a quotation without lines, and says when saving fails", async () => {
      await show(routes({ [`PUT ${base}/${QID}`]: { status: 400, error: { code: "invalid_request", message: "Line 1: Amount must be a number" } } }));
      await fireEvent.press(screen.getByRole("button", { name: "Remove line 1" }));
      await fireEvent.press(screen.getByRole("button", { name: "Send to customer" }));
      expect(screen.getByText("Add at least one line before sending the quotation.")).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole("button", { name: "Add line" }));
      await fireEvent.changeText(screen.getByLabelText("Line 1 item"), "Walls");
      await fireEvent.changeText(screen.getByLabelText("Line 1 amount in rupees"), "500");
      await fireEvent.press(screen.getByRole("button", { name: "Save draft" }));
      expect(await screen.findByText("Line 1: Amount must be a number")).toBeOnTheScreen();
    });
  });
});
