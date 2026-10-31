import { fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { router } from "expo-router";

import { Account, ProjectCard } from "~/components/account/Account";
import { AuthProvider } from "~/lib/auth-context";
import { FIELD_MESSAGES } from "~/shared";
import { asha, mockApi, offline, savedToken, seedToken, summary, type Answer } from "./helpers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  usePathname: jest.fn(() => "/account"),
  useLocalSearchParams: jest.fn(() => ({})),
}));

const me: Answer = { data: asha };
const press = (name: string | RegExp) => fireEvent.press(screen.getByRole("button", { name }));

async function show() {
  await render(
    <AuthProvider>
      <Account />
    </AuthProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

describe("the account screen", () => {
  it("opens the login screen when signed out, coming back here", async () => {
    mockApi({});
    await show();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith({ pathname: "/login", params: { next: "/account" } }));
    expect(screen.getByLabelText("Loading your account")).toBeOnTheScreen();
  });

  it("greets the customer and lists their projects with stage, meaning, last update and the final price", async () => {
    seedToken();
    mockApi({
      "GET /api/v1/me": me,
      "GET /api/v1/projects": { data: [summary({ id: "p-2", stage: "price_finalised", stageLabel: "Price finalised", finalPricePaise: 4500000 }), summary({ id: "p-1", service: null, locality: null, city: null })] },
    });
    await show();
    expect(await screen.findByRole("header", { name: "Namaste, Asha" })).toBeOnTheScreen();
    const first = await screen.findByRole("link", { name: /^Interior Painting in Kamla Nagar, Agra\. Price finalised\./ });
    expect(within(first).getByText("You approved the quotation. Nothing else is added without your written approval.")).toBeOnTheScreen();
    expect(within(first).getByText("Last update Fri 30 Oct 2026")).toBeOnTheScreen();
    expect(within(first).getByText("₹45,000")).toBeOnTheScreen();
    expect(first.props.accessibilityLabel).toContain("Final price 45,000 rupees");
    const second = screen.getByRole("link", { name: /^Painting project\. Quotation shared\./ });
    expect(within(second).queryByText(/Final price/)).toBeNull();
    await fireEvent.press(first);
    expect(router.push).toHaveBeenCalledWith("/account/projects/p-2");
    expect(screen.getByText("+91 98765 43210")).toBeOnTheScreen();
  });

  it("invites a first booking when there are no projects", async () => {
    seedToken();
    mockApi({ "GET /api/v1/me": { data: { ...asha, name: null } }, "GET /api/v1/projects": { data: [] } });
    await show();
    expect(await screen.findByRole("header", { name: "Your account" })).toBeOnTheScreen();
    expect(await screen.findByRole("header", { name: "No projects yet" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Book a free inspection" }));
    expect(router.push).toHaveBeenCalledWith("/book");
  });

  it("says when the projects cannot load, and tries again", async () => {
    seedToken();
    mockApi({ "GET /api/v1/me": me, "GET /api/v1/projects": [offline, { data: [summary()] }] });
    await show();
    expect(await screen.findByText("Network error. Please check your connection and try again.")).toBeOnTheScreen();
    await press("Try again");
    expect(await screen.findByRole("link", { name: /^Interior Painting in Kamla Nagar, Agra/ })).toBeOnTheScreen();
  });

  it("loads the customer once more when the session was restored offline", async () => {
    seedToken();
    mockApi({ "GET /api/v1/me": [offline, me], "GET /api/v1/projects": { data: [] } });
    await show();
    expect(await screen.findByRole("header", { name: "Namaste, Asha" })).toBeOnTheScreen();
  });
});

describe("the account screen: details", () => {
  it("saves a new name, with the website's message for one too short and the API's for a refusal", async () => {
    seedToken();
    const calls = mockApi({
      "GET /api/v1/me": me,
      "GET /api/v1/projects": { data: [] },
      "PATCH /api/v1/me": [{ status: 400, error: { code: "invalid_request", message: "Please check the highlighted fields.", details: { name: "Use 80 characters or fewer" } } }, { data: { ...asha, name: "Asha Rani" } }],
    });
    await show();
    const field = await screen.findByLabelText("Your name");
    expect(field).toHaveProp("value", "Asha Verma");
    expect(screen.getByRole("button", { name: "Save name" })).toBeDisabled();
    await fireEvent.changeText(field, "A");
    await press("Save name");
    expect(screen.getByText(FIELD_MESSAGES.name)).toBeOnTheScreen();
    await fireEvent.changeText(field, "Asha Rani");
    await press("Save name");
    expect(await screen.findByText("Use 80 characters or fewer")).toBeOnTheScreen();
    await press("Save name");
    expect(await screen.findByText("Saved.")).toBeOnTheScreen();
    expect(calls.filter((c) => c.method === "PATCH").at(-1)).toMatchObject({ body: { name: "Asha Rani" } });
    expect(screen.getByLabelText("Your name")).toHaveProp("value", "Asha Rani");
    expect(screen.getByRole("button", { name: "Save name" })).toBeDisabled();
  });

  it("drops Saved. as soon as the name is changed again", async () => {
    seedToken();
    mockApi({ "GET /api/v1/me": me, "GET /api/v1/projects": { data: [] }, "PATCH /api/v1/me": { data: { ...asha, name: "Asha V" } } });
    await show();
    const field = await screen.findByLabelText("Your name");
    await fireEvent.changeText(field, "Asha V");
    await press("Save name");
    expect(await screen.findByText("Saved.")).toBeOnTheScreen();
    await fireEvent.changeText(field, "Asha Ve");
    expect(screen.queryByText("Saved.")).toBeNull();
  });

  it("logs out and goes home, not to the login screen", async () => {
    seedToken();
    const calls = mockApi({ "GET /api/v1/me": me, "GET /api/v1/projects": { data: [] }, "POST /api/v1/auth/logout": { data: { signedOut: true } } });
    await show();
    await fireEvent.press(await screen.findByRole("button", { name: "Log out" }));
    await waitFor(() => expect(router.navigate).toHaveBeenCalledWith("/"));
    expect(router.replace).not.toHaveBeenCalled();
    expect(savedToken()).toBeUndefined();
    expect(calls.some((c) => c.path === "/api/v1/auth/logout")).toBe(true);
  });
});

describe("the account screen: deleting the account", () => {
  it("asks first, saying the bookings stay with us unlinked, and can be called off", async () => {
    seedToken();
    const calls = mockApi({ "GET /api/v1/me": me, "GET /api/v1/projects": { data: [] } });
    await show();
    await fireEvent.press(await screen.findByRole("button", { name: "Delete my account" }));
    expect(screen.getByRole("header", { name: "Delete your account?" })).toBeOnTheScreen();
    expect(screen.getByText(/Your bookings stay with us, no longer linked to an account/)).toBeOnTheScreen();
    await press("Keep my account");
    expect(screen.queryByRole("header", { name: "Delete your account?" })).toBeNull();
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
  });

  it("deletes it on the second tap and goes home; a failure says so and keeps the account", async () => {
    seedToken();
    const calls = mockApi({
      "GET /api/v1/me": me,
      "GET /api/v1/projects": { data: [] },
      "DELETE /api/v1/me": [{ status: 500, error: { code: "internal_error", message: "Something went wrong on our side. Please try again." } }, { data: { deleted: true } }],
    });
    await show();
    await fireEvent.press(await screen.findByRole("button", { name: "Delete my account" }));
    await press("Yes, delete my account");
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong on our side. Please try again.");
    expect(savedToken()).toBe("saved-token");
    await press("Yes, delete my account");
    await waitFor(() => expect(router.navigate).toHaveBeenCalledWith("/"));
    expect(router.replace).not.toHaveBeenCalled();
    expect(savedToken()).toBeUndefined();
    expect(calls.filter((c) => c.method === "DELETE")).toHaveLength(2);
  });
});

describe("ProjectCard", () => {
  it("leaves out a last update it cannot read", async () => {
    await render(<ProjectCard project={summary({ updatedAt: "bad" })} />);
    expect(screen.queryByText(/Last update/)).toBeNull();
    expect(screen.getByRole("link")).toHaveProp("accessibilityLabel", "Interior Painting in Kamla Nagar, Agra. Quotation shared");
  });
});
