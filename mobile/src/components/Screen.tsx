import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, gutter, TAB_BAR_SPACE } from "~/theme";

type Props = {
  children: ReactNode;
  /** Pushed under a stack header, which already clears the status bar. */
  underHeader?: boolean;
  testID?: string;
};

/** A scrolling screen on the cream canvas, with the side gutter and room for the tab bar. */
export function Screen({ children, underHeader = false, testID }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <ScrollView
        testID={testID}
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingTop: underHeader ? 12 : insets.top + 12 }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {children}
      </ScrollView>
      {/* the canvas behind the status bar, so text never scrolls under the clock */}
      {!underHeader && <View testID="status-bar-backing" pointerEvents="none" style={[styles.statusBar, { height: insets.top }]} />}
    </View>
  );
}

/** Vertical space between sections. */
export function Section({ children, first = false }: { children: ReactNode; first?: boolean }) {
  return <View style={first ? undefined : styles.section}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: gutter, paddingBottom: TAB_BAR_SPACE },
  section: { marginTop: 48 },
  statusBar: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: colors.canvas },
});
