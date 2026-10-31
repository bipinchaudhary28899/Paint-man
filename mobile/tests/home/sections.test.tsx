import { fireEvent, render, screen } from "@testing-library/react-native";

import { Journey, stepPhotos } from "~/components/home/Journey";
import { checks, firstSentence, Trust } from "~/components/home/Trust";
import { illustrations, images, promises, site, workFlow } from "~/shared";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  usePathname: jest.fn(() => "/"),
  useLocalSearchParams: jest.fn(() => ({})),
}));

// The journey's button glides through the page (usePage().scrollTo); the rest of Page is real.
const mockScrollTo = jest.fn();
jest.mock("~/components/site/Page", () => {
  const actual = jest.requireActual("~/components/site/Page");
  return { ...actual, usePage: () => ({ ...actual.usePage(), scrollTo: mockScrollTo, register: jest.fn() }) };
});

beforeEach(() => jest.clearAllMocks());

const stepButton = (i: number, count = workFlow.length) => screen.getByRole("button", { name: `Step ${i + 1} of ${count}: ${workFlow[i].title}` });

describe("the trust section", () => {
  it("cuts copy to its first sentence, and keeps one-sentence copy whole", () => {
    expect(firstSentence("You pay nothing up front. No payment is due before the work starts.")).toBe("You pay nothing up front.");
    expect(firstSentence("During working hours (9 am to 7 pm) to fix a visit")).toBe("During working hours (9 am to 7 pm) to fix a visit");
    expect(firstSentence("Is it free? Yes.")).toBe("Is it free?");
  });

  it("states the years, the diagnosis with its four checks, and each promise with its one line", async () => {
    await render(<Trust />);
    expect(screen.getByText(`${site.yearsPainting} saal`)).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "We diagnose first." })).toBeOnTheScreen();
    expect(screen.getByLabelText("What the inspection checks")).toBeOnTheScreen();
    for (const c of checks) expect(screen.getByText(c)).toBeOnTheScreen();
    promises.forEach((p, i) => {
      expect(screen.getByText(String(i + 1).padStart(2, "0"))).toBeOnTheScreen();
      expect(screen.getByRole("header", { name: p.title })).toBeOnTheScreen();
      expect(screen.getByText(firstSentence(p.text))).toBeOnTheScreen();
    });
  });

  it("claims nothing the owner has not stated: no ratings, reviews or counts", async () => {
    await render(<Trust />);
    expect(screen.queryByText(/★|rating|review|happy customers|homes painted|\d+\+/i)).toBeNull();
  });
});

describe("the journey", () => {
  it("puts its photos only on steps the website names", () => {
    const titles = workFlow.map((s) => s.title);
    for (const title of Object.keys(stepPhotos)) expect(titles).toContain(title);
  });

  it("opens one step at a time with its whole text, and closes it again", async () => {
    await render(<Journey />);
    expect(screen.getByLabelText(illustrations.toolbox.alt)).toBeOnTheScreen();
    expect(stepButton(0)).toBeExpanded();
    expect(screen.getByTestId("step-detail-0")).toHaveTextContent(workFlow[0].text);

    // a closed step shows its title and a one-line preview
    const inspection = workFlow.findIndex((s) => s.title === "Site inspection");
    expect(screen.queryByLabelText(images.coupleHome.alt)).toBeNull();
    await fireEvent.press(stepButton(inspection));
    expect(stepButton(inspection)).toBeExpanded();
    expect(stepButton(0)).not.toBeExpanded();
    expect(screen.queryByTestId("step-detail-0")).toBeNull();
    expect(screen.getByLabelText(images.coupleHome.alt)).toBeOnTheScreen();
    expect(screen.getByText(stepPhotos["Site inspection"].caption!)).toBeOnTheScreen();

    // a photo without a caption
    const prep = workFlow.findIndex((s) => s.title === "Preparation");
    await fireEvent.press(stepButton(prep));
    expect(screen.getByLabelText(images.uniformSkimming.alt)).toBeOnTheScreen();

    await fireEvent.press(stepButton(prep));
    expect(stepButton(prep)).not.toBeExpanded();
    expect(screen.queryByTestId(`step-detail-${prep}`)).toBeNull();
  });

  it("shows the owner's own illustration for a step that has one", async () => {
    const steps = [{ ...workFlow[0], image: { src: images.uniformCeiling.src, alt: "Owner's drawing of a booking" } }, workFlow[1]];
    await render(<Journey steps={steps} />);
    expect(screen.getByLabelText("Owner's drawing of a booking")).toBeOnTheScreen();
    // a step with no photo opens to its text alone
    await fireEvent.press(stepButton(1, 2));
    expect(screen.getByTestId("step-detail-1")).toHaveTextContent(workFlow[1].text);
  });

  it("ends with a button that glides to the booking card", async () => {
    await render(<Journey />);
    await fireEvent.press(screen.getByRole("button", { name: "Book a site visit" }));
    expect(mockScrollTo).toHaveBeenCalledWith("book-visit");
  });
});
