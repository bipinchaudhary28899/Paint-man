import { useEffect, useState, type ComponentRef, type RefObject } from "react";
import { Keyboard, Platform, TextInput, type View } from "react-native";
import type { SharedValue } from "react-native-reanimated";

// Android draws the app edge to edge, under the keyboard, so a page does not shrink when the keyboard
// opens: a field low on the screen stays hidden behind it, and Android's own "scroll the focused field
// into view" takes it for visible (the page still reaches the screen's bottom). While the keyboard is
// up this gives its height, which the page takes off its bottom, and once the page has shrunk it
// scrolls the field that has focus above the keyboard. After that, Android's own scrolling works for
// the next field (the page is the visible height). iOS keeps fields in view itself
// (automaticallyAdjustKeyboardInsets), so there this is always 0.

/** The space kept between a focused field and the keyboard's top. */
export const FIELD_GAP = 24;

type Scroller = { scrollTo: (to: { y: number; animated: boolean }) => void };
type ViewHandle = ComponentRef<typeof View>;

type Options = {
  scrollRef: RefObject<Scroller | null>;
  /** the page content: fields are measured against it */
  contentRef: RefObject<ViewHandle | null>;
  scrollY: SharedValue<number>;
  /** where the page content starts on screen (the header's bottom edge) */
  headerHeight: number;
  /** the window's height */
  viewport: number;
  os?: typeof Platform.OS;
};

/** How far to scroll so a field ending at `fieldBottom` (on screen) sits `FIELD_GAP` above a keyboard `room` tall; 0 when it is already clear. */
export function scrollToClear(fieldBottom: number, viewport: number, room: number): number {
  return Math.max(0, fieldBottom - (viewport - room - FIELD_GAP));
}

export function useKeyboardRoom({ scrollRef, contentRef, scrollY, headerHeight, viewport, os = Platform.OS }: Options): number {
  const [room, setRoom] = useState(0);

  useEffect(() => {
    if (os !== "android") return;
    let frame = 0;
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      const height = e.endCoordinates.height;
      setRoom(height);
      // once the page has shrunk (two frames: React commits, then Android lays it out), bring the field up
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          const field = TextInput.State.currentlyFocusedInput() as unknown as ViewHandle | null;
          const content = contentRef.current;
          if (!field || !content) return;
          field.measureLayout(
            content,
            (_x: number, y: number, _w: number, h: number) => {
              const by = scrollToClear(y + h + headerHeight - scrollY.value, viewport, height);
              if (by > 0) scrollRef.current?.scrollTo({ y: scrollY.value + by, animated: true });
            },
            () => undefined,
          );
        });
      });
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => setRoom(0));
    return () => {
      cancelAnimationFrame(frame);
      show.remove();
      hide.remove();
    };
  }, [os, scrollRef, contentRef, scrollY, headerHeight, viewport]);

  return room;
}
