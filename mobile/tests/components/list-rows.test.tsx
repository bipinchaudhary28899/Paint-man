import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { ListRows } from "~/components/ui/ListRows";
import { colors } from "~/theme";

const flat = (style: unknown) => StyleSheet.flatten(style as never) as Record<string, unknown>;

describe("list rows", () => {
  it("lists links as full-width rows, each at least 44pt tall, with a detail and an arrow", async () => {
    const reds = jest.fn();
    await render(
      <ListRows
        accessibilityLabel="Colour families"
        rows={[
          { key: "red", label: "Reds", detail: "120", swatch: "#b5473a", onPress: reds },
          { key: "blue", label: "Blues", detail: "98", onPress: jest.fn() },
        ]}
      />,
    );
    const list = screen.getByLabelText("Colour families");
    const links = within(list).getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(flat(links[0].props.style).width).toBe("100%");
    expect(flat(links[0].props.style).minHeight).toBeGreaterThanOrEqual(44);
    expect(within(links[0]).getByText("120")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: /Reds/ }));
    expect(reds).toHaveBeenCalled();
  });

  it("draws a shade's swatch for its dot, and the terracotta dot otherwise", async () => {
    await render(<ListRows rows={[{ key: "a", label: "Pepper Leaf", swatch: "#bbc8b2" }, { key: "b", label: "Tajganj" }]} />);
    const dot = (label: string) => flat((screen.getByText(label).parent!.children[0] as unknown as { props: { style: unknown } }).props.style);
    expect(dot("Pepper Leaf").backgroundColor).toBe("#bbc8b2");
    expect(dot("Tajganj").backgroundColor).toBe(colors.terracotta);
  });

  it("names a link by its own label when the label alone is not enough", async () => {
    await render(<ListRows rows={[{ key: "i", label: "Interior Painting", accessibilityLabel: "Interior Painting in Agra", onPress: jest.fn() }]} />);
    expect(screen.getByRole("link", { name: "Interior Painting in Agra" })).toBeOnTheScreen();
  });

  it("shows the current page in terracotta, selected, and not as a link", async () => {
    await render(<ListRows rows={[{ key: "w", label: "Whites", current: true, onPress: jest.fn() }]} />);
    expect(screen.queryByRole("link")).toBeNull();
    const label = screen.getByText("Whites");
    expect(label).toHaveStyle({ color: colors.terracotta });
    expect(label.parent).toBeSelected();
  });

  it("puts short labels in two columns and lists plain facts without links", async () => {
    await render(<ListRows accessibilityLabel="Checks" columns={2} rows={["Moisture", "Hairline cracks", "Flaking"].map((c) => ({ key: c, label: c }))} />);
    expect(screen.queryByRole("link")).toBeNull();
    const row = screen.getByText("Moisture").parent!;
    expect(flat(row.props.style).width).toBe("50%");
  });
});
