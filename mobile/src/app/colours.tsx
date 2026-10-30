import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { ColourFinder } from "~/components/ColourFinder";
import { Screen } from "~/components/Screen";
import { Accent, Body, Heading } from "~/components/Text";
import { shadeBookingNote } from "~/lib/colours";

export default function Colours() {
  return (
    <Screen testID="colours">
      <Heading level={1}>
        Find your <Accent>shade</Accent>
      </Heading>
      <Body style={styles.intro}>
        Search the paint brands' own shade cards by name, code or hex. Pick a shade and book an inspection: the inspector brings the card.
      </Body>
      <View style={styles.finder}>
        <ColourFinder onBook={(shade) => router.navigate({ pathname: "/book", params: { message: shadeBookingNote(shade) } })} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: 14 },
  finder: { marginTop: 20 },
});
