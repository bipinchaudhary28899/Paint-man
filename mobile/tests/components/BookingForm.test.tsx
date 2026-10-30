import { fireEvent, render, screen } from "@testing-library/react-native";
import { Linking, Platform } from "react-native";

import { BookingForm } from "~/components/BookingForm";
import { FORM_ERROR } from "~/lib/booking";
import { webUrl } from "~/lib/config";
import { FIELD_MESSAGES, liveCities } from "~/shared";

const live = liveCities();
const [agra, mathura] = live;
const submit = () => fireEvent.press(screen.getByRole("button", { name: "Book my inspection" }));
const type = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);

async function fillRequired() {
  await type("Your name", "Asha Verma");
  await type("Mobile number", "98765 43210");
  await type("House / flat no., building and street", "12, Rose Villa, Nehru Road");
  await fireEvent.press(screen.getByRole("button", { name: agra.name }));
  await fireEvent.press(screen.getByRole("button", { name: agra.areas[0] }));
  await type("PIN code", "282005");
}

describe("BookingForm", () => {
  it("shows the website's message for every required field left empty", async () => {
    const onDone = jest.fn();
    await render(<BookingForm onDone={onDone} />);
    await submit();
    for (const field of ["name", "phone", "address", "city", "locality", "pincode"] as const) {
      expect(screen.getByText(FIELD_MESSAGES[field])).toBeOnTheScreen();
    }
    expect(screen.getByRole("alert")).toHaveTextContent(FORM_ERROR);
    expect(onDone).not.toHaveBeenCalled();
  });

  it("books a complete form, reported as not sent while the endpoint is stubbed", async () => {
    const onDone = jest.fn();
    await render(<BookingForm onDone={onDone} />);
    await fillRequired();
    await submit();
    expect(onDone).toHaveBeenCalledWith({ sent: false });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("checks a field the visitor leaves, ignores an empty one, and clears the error once fixed", async () => {
    await render(<BookingForm onDone={jest.fn()} />);
    const phone = screen.getByLabelText("Mobile number");
    await fireEvent(phone, "blur");
    expect(screen.queryByText(FIELD_MESSAGES.phone)).toBeNull();
    await fireEvent.changeText(phone, "12345");
    await fireEvent(phone, "blur");
    expect(screen.getByText(FIELD_MESSAGES.phone)).toBeOnTheScreen();
    await fireEvent(phone, "blur");
    expect(screen.getAllByText(FIELD_MESSAGES.phone)).toHaveLength(1);
    await fireEvent.changeText(phone, "1234567");
    expect(screen.getByText(FIELD_MESSAGES.phone)).toBeOnTheScreen();
    await fireEvent.changeText(phone, "+91 98765 43210");
    expect(screen.queryByText(FIELD_MESSAGES.phone)).toBeNull();
  });

  it("drops the form line when the last error is fixed", async () => {
    await render(<BookingForm onDone={jest.fn()} />);
    await fillRequired();
    await type("PIN code", "28");
    await submit();
    expect(screen.getByRole("alert")).toBeOnTheScreen();
    await type("PIN code", "282005");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("suggests the localities of the chosen city", async () => {
    await render(<BookingForm onDone={jest.fn()} />);
    expect(screen.getByText(/Choose your city to pick from the localities/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: mathura.name }));
    expect(screen.getByRole("button", { name: mathura.areas[0] })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: agra.areas[0] })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: mathura.areas[0] }));
    expect(screen.getByLabelText("Locality")).toHaveProp("value", mathura.areas[0]);
  });

  it("asks no city when only one is live", async () => {
    await render(<BookingForm onDone={jest.fn()} live={[agra]} />);
    expect(screen.queryByText("City")).toBeNull();
    expect(screen.getByLabelText(`Locality in ${agra.name}`)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: agra.areas[1] })).toBeOnTheScreen();
  });

  it("keeps the job details optional, with choices that toggle and a live size estimate", async () => {
    await render(<BookingForm onDone={jest.fn()} />);
    expect(screen.queryByText("What needs painting?")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: /Add more details/ }));
    const interior = screen.getByRole("button", { name: "Interior Painting" });
    await fireEvent.press(interior);
    expect(screen.getByRole("button", { name: "Interior Painting" })).toBeSelected();
    await fireEvent.press(screen.getByRole("button", { name: "Interior Painting" }));
    expect(screen.getByRole("button", { name: "Interior Painting" })).not.toBeSelected();
    await fireEvent.press(screen.getByRole("button", { name: "2 floors" }));
    await fireEvent.press(screen.getByRole("button", { name: "1 floor" }));
    await fireEvent.press(screen.getByRole("button", { name: "Villa / Kothi" }));
    await fireEvent.press(screen.getByRole("button", { name: "2 BHK" }));
    expect(screen.getByText(/It's on your sale deed/)).toBeOnTheScreen();
    await type("Carpet area per floor (sq ft)", "1000");
    expect(screen.getByText(/of walls and ceilings to paint/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Doors, Windows & Small Jobs" }));
    expect(screen.getByText("Measured on site for this job.")).toBeOnTheScreen();
    await type("Anything we should know?", "Two doors");
    expect(screen.getByLabelText("Anything we should know?")).toHaveProp("value", "Two doors");
  });

  it("refuses a carpet area out of range, opening the details to show it", async () => {
    await render(<BookingForm onDone={jest.fn()} prefill={{ carpetArea: "50" }} />);
    await fillRequired();
    await fireEvent.press(screen.getByRole("button", { name: /Add more details/ }));
    expect(screen.queryByText("What needs painting?")).toBeNull();
    await submit();
    expect(screen.getByText(/Enter the carpet area in sq ft/)).toBeOnTheScreen();
    expect(screen.getByText("What needs painting?")).toBeOnTheScreen();
  });

  it("opens with the details showing when a note is prefilled", async () => {
    await render(<BookingForm onDone={jest.fn()} prefill={{ message: "Interested in Asian Paints 8386 Pepper Leaf" }} />);
    expect(screen.getByLabelText("Anything we should know?")).toHaveProp("value", "Interested in Asian Paints 8386 Pepper Leaf");
  });

  it("picks, keeps and clears a preferred date", async () => {
    await render(<BookingForm onDone={jest.fn()} prefill={{ service: "Interior Painting" }} />);
    await fireEvent.press(screen.getByRole("button", { name: "Choose a date" }));
    await fireEvent(screen.getByTestId("date-picker"), "dismiss");
    expect(screen.queryByTestId("date-picker")).toBeNull();
    expect(screen.getByText("Choose a date")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Choose a date" }));
    await fireEvent(screen.getByTestId("date-picker"), "valueChange", { type: "set" }, new Date(2026, 11, 25));
    expect(screen.getByText("Fri 25 Dec 2026")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByTestId("date-picker")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Clear the date" }));
    expect(screen.getByText("Choose a date")).toBeOnTheScreen();
  });

  it("on Android, shows the system date dialog and closes it on a pick", async () => {
    const os = Platform.OS;
    Platform.OS = "android";
    try {
      await render(<BookingForm onDone={jest.fn()} prefill={{ service: "Interior Painting" }} />);
      await fireEvent.press(screen.getByRole("button", { name: "Choose a date" }));
      expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
      await fireEvent(screen.getByTestId("date-picker"), "valueChange", { type: "set" }, new Date(2027, 0, 9));
      expect(screen.queryByTestId("date-picker")).toBeNull();
      expect(screen.getByText("Sat 9 Jan 2027")).toBeOnTheScreen();
    } finally {
      Platform.OS = os;
    }
  });

  it("links to the privacy policy on the website", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    await render(<BookingForm onDone={jest.fn()} />);
    await fireEvent.press(screen.getByRole("link", { name: "privacy policy" }));
    expect(open).toHaveBeenCalledWith(webUrl("/privacy-policy"));
  });
});
