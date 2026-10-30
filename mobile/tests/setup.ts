// Shared test setup: the native date picker has no test renderer of its own, so it becomes a plain
// view that tests drive through its onChange prop.
jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = jest.requireActual("react-native");
  const { createElement } = jest.requireActual("react");
  return { __esModule: true, default: (props: Record<string, unknown>) => createElement(View, { ...props, testID: props.testID ?? "date-picker" }) };
});
