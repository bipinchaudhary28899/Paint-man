import { fireEvent, render, screen } from "@testing-library/react-native";
import { createRef } from "react";
import { AccessibilityInfo, Keyboard, Platform, Text } from "react-native";

import { Button } from "~/components/ui/Button";
import { Arrow, Card, Chevron, LinkArrow, Pill, Plus, Sticker, Swipe } from "~/components/ui/Bits";
import { DateInput, Field, FIELD_BORDER, Input, optionsOf, PhoneInput, PillChoice, Select, type Focusable } from "~/components/ui/Field";
import { Art, Logo, Photo } from "~/components/ui/Media";
import { Em, Eyebrow, H, P, Strong } from "~/components/ui/Text";
import { contrast } from "~/lib/contrast";
import { illustrations, images } from "~/shared";
import { colors } from "~/theme";

describe("type and buttons", () => {
  it("renders headings as headers with their accent word", async () => {
    await render(
      <>
        <H size={40}>
          Find your <Em>shade</Em>
        </H>
        <P weight="semibold">
          Body <Strong>bold</Strong>
        </P>
        <Eyebrow>Free estimate</Eyebrow>
      </>,
    );
    expect(screen.getByRole("header", { name: "Find your shade" })).toBeOnTheScreen();
    expect(screen.getByText("Free estimate")).toBeOnTheScreen();
  });

  it("presses, and while busy or disabled ignores presses", async () => {
    const onPress = jest.fn();
    const { rerender } = await render(<Button label="Book a site visit" onPress={onPress} large />);
    await fireEvent.press(screen.getByRole("button", { name: "Book a site visit" }));
    expect(onPress).toHaveBeenCalledTimes(1);
    await rerender(<Button label="Book" busyLabel="Sending…" busy onPress={onPress} variant="dark" />);
    expect(screen.getByRole("button", { name: "Sending…" })).toBeBusy();
    await rerender(<Button label="Explore colours" variant="secondary" disabled onPress={onPress} height={54} fontSize={16} accessibilityRole="link" />);
    expect(screen.getByRole("link", { name: "Explore colours" })).toBeDisabled();
  });

  it("renders the small pieces", async () => {
    const onPress = jest.fn();
    await render(
      <>
        <Card radius={18}>
          <Text>card</Text>
        </Card>
        <Arrow />
        <LinkArrow label="All services" onPress={onPress} />
        <Plus open />
        <Plus open={false} />
        <Chevron up />
        <Chevron />
        <Pill>Zero advance</Pill>
        <Sticker>Before</Sticker>
        <Swipe>
          <Text>row</Text>
        </Swipe>
      </>,
    );
    await fireEvent.press(screen.getByRole("link", { name: "All services" }));
    expect(onPress).toHaveBeenCalled();
    for (const t of ["card", "Zero advance", "Before", "row"]) expect(screen.getByText(t)).toBeOnTheScreen();
  });

  it("labels photos, illustrations and logos, and hides decorative ones", async () => {
    await render(
      <>
        <Photo image={images.livingRoom} aspectRatio={4 / 5} position="center" />
        <Photo image={images.houseFront} decorative />
        <Art art={illustrations.toolbox} width={104} />
        <Logo />
        <Logo name="stackedReversed" decorative />
      </>,
    );
    expect(screen.getByLabelText(images.livingRoom.alt)).toBeOnTheScreen();
    expect(screen.queryByLabelText(images.houseFront.alt)).toBeNull();
    expect(screen.getByLabelText(illustrations.toolbox.alt)).toBeOnTheScreen();
    expect(screen.getAllByLabelText("Paint Saathi")).toHaveLength(1);
  });
});

describe("fields", () => {
  it("shows a label, an error, and the focus border", async () => {
    const onBlur = jest.fn();
    await render(
      <Field label="Your name" error="Enter your name">
        <Input accessibilityLabel="Your name" error="Enter your name" onBlur={onBlur} />
      </Field>,
    );
    expect(screen.getByText("Enter your name")).toBeOnTheScreen();
    const input = screen.getByLabelText("Your name");
    await fireEvent(input, "focus");
    expect(input).toHaveStyle({ borderColor: "#b5473a" });
    await fireEvent(input, "blur");
    expect(onBlur).toHaveBeenCalled();
  });

  it("puts +91 inside the mobile field", async () => {
    await render(<PhoneInput accessibilityLabel="Mobile number" />);
    expect(screen.getByText("+91")).toBeOnTheScreen();
    expect(screen.getByLabelText("Mobile number")).toHaveProp("keyboardType", "phone-pad");
    // the number starts after the +91 box at the default size...
    expect(screen.getByLabelText("Mobile number")).toHaveStyle({ paddingLeft: 57.6 });
    // ...and after it still when a larger text size widens the box
    await fireEvent(screen.getByTestId("phone-prefix"), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 64, height: 48 } } });
    expect(screen.getByLabelText("Mobile number")).toHaveStyle({ paddingLeft: 73.6 });
  });

  it("draws the field's edge at 3:1 against white and the canvas (WCAG 1.4.11)", async () => {
    await render(<Input accessibilityLabel="Name" />);
    expect(screen.getByLabelText("Name")).toHaveStyle({ borderColor: FIELD_BORDER });
    expect(contrast(FIELD_BORDER, colors.paper)).toBeGreaterThanOrEqual(3);
    expect(contrast(FIELD_BORDER, colors.canvas)).toBeGreaterThanOrEqual(3);
  });

  it("opens a select's choices, picks one, and can clear or cancel", async () => {
    const onChange = jest.fn();
    await render(<Select label="Property type" value="Villa / Kothi" options={optionsOf(["Apartment / Flat", "Villa / Kothi"])} onChange={onChange} />);
    expect(screen.getByLabelText("Property type")).toHaveAccessibilityValue({ text: "Villa / Kothi" });
    await fireEvent.press(screen.getByLabelText("Property type"));
    await fireEvent.press(screen.getByRole("button", { name: "Apartment / Flat" }));
    expect(onChange).toHaveBeenLastCalledWith("Apartment / Flat");
    await fireEvent.press(screen.getByLabelText("Property type"));
    await fireEvent.press(screen.getByRole("button", { name: "Select" }));
    expect(onChange).toHaveBeenLastCalledWith("");
    await fireEvent.press(screen.getByLabelText("Property type"));
    await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("shows the prompt of a required select with no blank choice", async () => {
    await render(<Select label="City" value="" placeholder="Select your city" allowBlank={false} options={[{ value: "agra", label: "Agra" }]} onChange={jest.fn()} error="Choose your city" />);
    expect(screen.getByText("Select your city")).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText("City"));
    expect(screen.queryByRole("button", { name: "Select your city" })).toBeNull();
    // a tap on the dimmed backdrop closes the sheet
    await fireEvent.press(screen.getByTestId("sheet-backdrop", { includeHiddenElements: true }));
    expect(screen.queryByRole("button", { name: "Agra" })).toBeNull();
  });

  it("keeps a select's choices reachable one by one by a screen reader, the backdrop hidden from it", async () => {
    await render(<Select label="City" value="agra" options={[{ value: "agra", label: "Agra" }, { value: "mathura", label: "Mathura" }]} onChange={jest.fn()} />);
    await fireEvent.press(screen.getByLabelText("City"));
    // each choice is its own button (not swallowed by an accessible backdrop around the sheet)
    expect(screen.getByRole("button", { name: "Agra" })).toBeSelected();
    expect(screen.getByRole("button", { name: "Mathura" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeOnTheScreen();
    expect(screen.queryByTestId("sheet-backdrop")).toBeNull();
    expect(screen.getByTestId("sheet-backdrop", { includeHiddenElements: true })).toHaveProp("importantForAccessibility", "no-hide-descendants");
    // Android's back button closes it
    await fireEvent(screen.getByTestId("select-sheet"), "requestClose");
    expect(screen.queryByRole("button", { name: "Mathura" })).toBeNull();
  });

  it("picks, clears and closes a date on iOS", async () => {
    const onChange = jest.fn();
    const { rerender } = await render(<DateInput label="Preferred inspection date" value="" min="2026-10-31" max="2027-10-31" onChange={onChange} />);
    expect(screen.getByText("dd/mm/yyyy")).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText("Preferred inspection date"));
    await fireEvent(screen.getByTestId("date-picker"), "valueChange", { type: "set" }, new Date(2026, 10, 5));
    expect(onChange).toHaveBeenLastCalledWith("2026-11-05");
    await fireEvent.press(screen.getByRole("button", { name: "Done" }));
    await rerender(<DateInput label="Preferred inspection date" value="2026-11-05" min="2026-10-31" max="2027-10-31" onChange={onChange} />);
    expect(screen.getByText("Thu 5 Nov 2026")).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText("Preferred inspection date"));
    await fireEvent.press(screen.getByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenLastCalledWith("");
    await fireEvent.press(screen.getByLabelText("Preferred inspection date"));
    await fireEvent(screen.getByTestId("date-picker"), "dismiss");
  });

  it("uses the system date dialog on Android, closing it on a pick", async () => {
    const os = Platform.OS;
    Platform.OS = "android";
    try {
      const onChange = jest.fn();
      await render(<DateInput label="Date" value="" min="2026-10-31" max="2027-10-31" onChange={onChange} />);
      await fireEvent.press(screen.getByLabelText("Date"));
      expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
      await fireEvent(screen.getByTestId("date-picker"), "valueChange", { type: "set" }, new Date(2027, 0, 9));
      expect(onChange).toHaveBeenCalledWith("2027-01-09");
      expect(screen.queryByTestId("date-picker")).toBeNull();
    } finally {
      Platform.OS = os;
    }
  });

  it("picks one of a few choices from a row of pills, announced as radios", async () => {
    const onChange = jest.fn();
    const options = [
      { value: "agra", label: "Agra" },
      { value: "mathura", label: "Mathura" },
    ];
    const { rerender } = await render(<PillChoice label="City" value="" options={options} onChange={onChange} error="Choose your city" />);
    expect(screen.getByLabelText("City")).toHaveProp("accessibilityHint", "Choose your city");
    expect(screen.getByRole("radio", { name: "Agra" })).not.toBeChecked();
    await fireEvent.press(screen.getByRole("radio", { name: "Mathura" }));
    expect(onChange).toHaveBeenCalledWith("mathura");
    await rerender(<PillChoice label="City" value="mathura" options={options} onChange={onChange} />);
    expect(screen.getByRole("radio", { name: "Mathura" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Agra" })).not.toBeChecked();
  });

  it("lays a long list on one sideways line and takes focus for the screen reader", async () => {
    const ref = createRef<Focusable>();
    const dismiss = jest.spyOn(Keyboard, "dismiss");
    await render(<PillChoice ref={ref} scroll label="Localities" value="Dayalbagh" options={optionsOf(["Kamla Nagar", "Dayalbagh"])} onChange={jest.fn()} />);
    expect(screen.getByRole("radio", { name: "Dayalbagh" })).toBeChecked();
    ref.current!.focus();
    expect(dismiss).toHaveBeenCalled();
    expect(AccessibilityInfo.sendAccessibilityEvent).toHaveBeenCalledWith(expect.anything(), "focus");
  });
});
