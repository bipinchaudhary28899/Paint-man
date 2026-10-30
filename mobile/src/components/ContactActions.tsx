import { Linking, StyleSheet, View } from "react-native";

import { contactLinks, type ContactLink } from "~/lib/contact";
import { Button } from "./Button";

/**
 * Call and WhatsApp buttons for the numbers in the website's src/config/site.ts. Nothing renders
 * until a number is filled in there.
 */
export function ContactActions({ links = contactLinks() }: { links?: ContactLink[] }) {
  if (links.length === 0) return null;
  return (
    <View style={styles.row}>
      {links.map((link) => (
        <Button key={link.kind} label={link.label} variant="secondary" style={styles.button} onPress={() => void Linking.openURL(link.url)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  button: { flex: 1 },
});
