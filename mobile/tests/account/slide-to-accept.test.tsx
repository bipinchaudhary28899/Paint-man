import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Alert, type AlertButton } from "react-native";
import { getAnimatedStyle } from "react-native-reanimated";

import { ACCEPT_AT, knobAt, SlideToAccept } from "~/components/account/SlideToAccept";
import { ProjectTracker } from "~/components/account/Tracker";
import { AuthProvider } from "~/lib/auth-context";
import { acceptableQuotation, type Quotation } from "~/lib/projects";
import { drag } from "../colours/touch";
import { asha, detail, mockApi, seedToken } from "./helpers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  usePathname: jest.fn(() => "/account/projects/p"),
  useLocalSearchParams: jest.fn(() => ({})),
}));

// "Slide to accept" on a quotation: the bar, and accepting through it on the project screen.

const W = 320; // the bar's width: the knob (52) and its 4pt padding each side leave 260pt of travel
const TRAVEL = W - 52 - 8;
const bar = () => screen.getByTestId("slide-to-accept");
const touch = () => screen.getByTestId("slide-to-accept-touch");
const knobX = () => (getAnimatedStyle as unknown as (el: unknown) => { transform: { translateX: number }[] })(screen.getByTestId("slide-knob")).transform[0].translateX;
const settle = (ms = 600) => act(() => new Promise((r) => setTimeout(r, ms)));

async function showBar(props: Partial<Parameters<typeof SlideToAccept>[0]> = {}) {
  const onSlid = jest.fn();
  const view = await render(<SlideToAccept label="Slide to accept ₹22,500" accessibilityLabel="Accept quotation version 2, 22,500 rupees" onSlid={onSlid} {...props} />);
  await fireEvent(bar(), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: W, height: 60 } } });
  return { onSlid, view };
}

beforeEach(() => jest.clearAllMocks());

describe("SlideToAccept", () => {
  it("keeps the knob on the bar", () => {
    expect(knobAt(0, -40, TRAVEL)).toBe(0);
    expect(knobAt(20, 100, TRAVEL)).toBe(120);
    expect(knobAt(0, 900, TRAVEL)).toBe(TRAVEL);
  });

  it("asks for confirmation once the knob is slid past most of the way, and stays there", async () => {
    const { onSlid } = await showBar();
    expect(screen.getByText("Slide to accept ₹22,500")).toBeOnTheScreen();
    expect(await drag(touch(), [[2, 0], [TRAVEL * ACCEPT_AT + 10, 1]])).toBe(true);
    expect(onSlid).toHaveBeenCalledTimes(1);
    await settle();
    expect(knobX()).toBeCloseTo(TRAVEL, 0);
  });

  it("springs back when let go too early, and leaves a vertical swipe to the page", async () => {
    const { onSlid } = await showBar();
    await drag(touch(), [[2, 0], [TRAVEL * 0.5, 2]]);
    await settle();
    expect(onSlid).not.toHaveBeenCalled();
    expect(knobX()).toBeCloseTo(0, 0);
    expect(await drag(touch(), [[0, 4], [3, 60]])).toBe(false);
  });

  it("goes back when the screen says so (not confirmed), and holds still while accepting", async () => {
    const { onSlid, view } = await showBar();
    await drag(touch(), [[2, 0], [TRAVEL, 0]]);
    await view.rerender(<SlideToAccept label="Slide to accept ₹22,500" accessibilityLabel="x" onSlid={onSlid} resetKey={1} />);
    await settle();
    expect(knobX()).toBeCloseTo(0, 0);
    await view.rerender(<SlideToAccept label="Slide to accept ₹22,500" accessibilityLabel="x" onSlid={onSlid} busy resetKey={1} />);
    expect(screen.getByText("Accepting…")).toBeOnTheScreen();
    expect(await drag(touch(), [[2, 0], [TRAVEL, 0]])).toBe(false);
  });

  it("is one button for a screen reader, which asks for the same confirmation", async () => {
    const { onSlid } = await showBar();
    expect(bar()).toHaveProp("accessibilityRole", "button");
    expect(bar()).toHaveProp("accessibilityLabel", "Accept quotation version 2, 22,500 rupees");
    await fireEvent(bar(), "accessibilityAction", { nativeEvent: { actionName: "activate" } });
    expect(onSlid).toHaveBeenCalledTimes(1);
    await fireEvent(bar(), "accessibilityAction", { nativeEvent: { actionName: "magicTap" } });
    expect(onSlid).toHaveBeenCalledTimes(1);
  });
});

describe("acceptableQuotation", () => {
  const q = (over: Partial<Quotation>): Quotation => ({ ...detail().quotations[0], ...over });
  it("is the latest version sent while its price holds", () => {
    expect(acceptableQuotation([q({ id: "a", version: 1 }), q({ id: "b", version: 2, validUntil: null })], "2026-11-01")?.id).toBe("b");
    expect(acceptableQuotation([q({ id: "a", version: 1, validUntil: "2026-11-01" })], "2026-11-01")?.id).toBe("a");
    expect(acceptableQuotation([q({ version: 2, validUntil: "2026-10-31" })], "2026-11-01")).toBeUndefined();
    expect(acceptableQuotation([q({ status: "approved" })], "2026-11-01")).toBeUndefined();
  });
});

describe("accepting a quotation on the project screen", () => {
  const ID = "3f0c2b1a-1111-4222-8333-444455556666";
  const sent = detail({ id: ID, quotations: [{ ...detail().quotations[0], validUntil: "2099-12-31" }, detail().quotations[1]] });
  const accepted = detail({ id: ID, stage: "price_finalised", quotations: [{ ...sent.quotations[0], status: "approved", approvedAt: "2026-11-01T06:30:00.000Z" }, sent.quotations[1]] });
  const ACCEPT = `POST /api/v1/projects/${ID}/quotations/q2/accept`;

  /** Answers the confirmation with the button labelled `choice`. */
  const answer = (choice: "Accept" | "Not now") =>
    jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons?: AlertButton[]) => buttons?.find((b) => b.text === choice)?.onPress?.());

  async function show(acceptAnswer: Parameters<typeof mockApi>[0][string]) {
    seedToken();
    const calls = mockApi({ "GET /api/v1/me": { data: asha }, [`GET /api/v1/projects/${ID}`]: { data: sent }, [ACCEPT]: acceptAnswer });
    await render(
      <AuthProvider>
        <ProjectTracker id={ID} />
      </AuthProvider>,
    );
    await screen.findByTestId("slide-to-accept");
    await fireEvent(bar(), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: W, height: 60 } } });
    return calls;
  }

  it("confirms, accepts and shows the final price", async () => {
    const confirm = answer("Accept");
    const calls = await show({ data: accepted });
    expect(screen.getByText("Slide to accept ₹22,500")).toBeOnTheScreen();
    await drag(touch(), [[2, 0], [TRAVEL, 0]]);
    expect(confirm).toHaveBeenCalledWith("Accept this quotation?", expect.stringContaining("₹22,500 for version 2. The price becomes final"), expect.any(Array), expect.any(Object));
    await waitFor(() => expect(screen.queryByTestId("slide-to-accept")).toBeNull());
    expect(calls.find((c) => c.path.endsWith("/accept"))).toMatchObject({ method: "POST", headers: { Authorization: "Bearer saved-token" } });
    expect(screen.getByText("Final price")).toBeOnTheScreen();
  });

  it("does nothing when the customer says not now", async () => {
    answer("Not now");
    const calls = await show({ data: accepted });
    await drag(touch(), [[2, 0], [TRAVEL, 0]]);
    await settle();
    expect(calls.some((c) => c.path.endsWith("/accept"))).toBe(false);
    expect(knobX()).toBeCloseTo(0, 0);
  });

  it("says why when it cannot be accepted, and sends the knob back", async () => {
    answer("Accept");
    await show({ status: 409, error: { code: "quotation_expired", message: "This price held until 2026-11-14. Message us and we'll send a fresh quotation." } });
    await drag(touch(), [[2, 0], [TRAVEL, 0]]);
    expect(await screen.findByText("This price held until 2026-11-14. Message us and we'll send a fresh quotation.")).toBeOnTheScreen();
    await settle();
    expect(knobX()).toBeCloseTo(0, 0);
  });

  it("is only on the quotation that can be accepted", async () => {
    seedToken();
    mockApi({ "GET /api/v1/me": { data: asha }, [`GET /api/v1/projects/${ID}`]: { data: detail({ id: ID, quotations: [{ ...sent.quotations[0], validUntil: "2020-01-31" }] }) } });
    await render(
      <AuthProvider>
        <ProjectTracker id={ID} />
      </AuthProvider>,
    );
    await screen.findByText(/Quotation, version 2/);
    expect(screen.queryByTestId("slide-to-accept")).toBeNull();
  });
});
