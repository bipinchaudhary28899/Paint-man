import { act, type screen } from "@testing-library/react-native";

type Element = ReturnType<typeof screen.getByTestId>;

// One finger on a PanResponder view, for the drag tests: React Native's responder events carry a touch
// history, from which PanResponder works out how far (dx, dy) and how fast (vx, vy) the finger moved.
// The view's responder handlers are called as React Native's responder system calls them (fireEvent
// skips a view whose onStartShouldSetResponder says no, which a drag-only PanResponder always does).

/** The responder event at time `t` (ms), the finger at (x, y) after being at (px, py). */
export function touchAt(t: number, x: number, y: number, px = x, py = y) {
  return {
    touchHistory: {
      numberActiveTouches: 1,
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: t,
      touchBank: [
        {
          touchActive: true,
          startPageX: 0,
          startPageY: 0,
          startTimeStamp: 0,
          currentPageX: x,
          currentPageY: y,
          currentTimeStamp: t,
          previousPageX: px,
          previousPageY: py,
          previousTimeStamp: t - 1,
        },
      ],
    },
    nativeEvent: { touches: [], changedTouches: [], identifier: 0, pageX: x, pageY: y, locationX: x, locationY: y, timestamp: t },
  };
}

/** The time of the last touch event: every drag goes on from it, as a real finger's timestamps do. */
let clock = 0;

/**
 * Drags a finger from (0, 0) through `points` ([x, y], one every 16ms): the view is asked whether it
 * takes the move; if it does, it is granted the touch, follows the rest and is released. Returns
 * whether it took the move. PanResponder measures the drag from the grant (the first point).
 */
export async function drag(view: Element, points: [number, number][]): Promise<boolean> {
  const handler = (name: string) => view.props[name] as (e: unknown) => unknown;
  const on = (name: string, e: unknown) => act(async () => void handler(name)(e));
  // the finger goes down (a new gesture), then moves
  handler("onStartShouldSetResponderCapture")({ ...touchAt(clock, 0, 0), nativeEvent: { touches: [{}] } });
  const [fx, fy] = points[0];
  const first = touchAt((clock += 16), fx, fy, 0, 0);
  // the capture phase measures the move, the bubble phase asks whether the view takes it
  handler("onMoveShouldSetResponderCapture")(first);
  if (!handler("onMoveShouldSetResponder")(first)) return false;
  await on("onResponderGrant", first);
  let [px, py] = [fx, fy];
  for (const [x, y] of points.slice(1)) {
    await on("onResponderMove", touchAt((clock += 16), x, y, px, py));
    [px, py] = [x, y];
  }
  await on("onResponderRelease", touchAt((clock += 16), px, py));
  return true;
}
