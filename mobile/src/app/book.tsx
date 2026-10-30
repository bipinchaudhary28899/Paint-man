import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";

import { BookingForm } from "~/components/BookingForm";
import { Button } from "~/components/Button";
import { Card } from "~/components/Card";
import { ContactActions } from "~/components/ContactActions";
import { StepList } from "~/components/Lists";
import { Art } from "~/components/Media";
import { Screen, Section } from "~/components/Screen";
import { Accent, Body, Heading } from "~/components/Text";
import { bookingPrefill } from "~/lib/prefill";
import { webUrl } from "~/lib/config";
import { bookingSteps, illustrations, site } from "~/shared";

type Params = { service?: string; city?: string; message?: string };

export default function Book() {
  const params = useLocalSearchParams<Params>();
  const prefill = bookingPrefill(params);
  const prefillKey = JSON.stringify(prefill);
  // The confirmation belongs to the booking it followed: arriving with a new service, city or shade shows the form again.
  const [done, setDone] = useState<{ sent: boolean; prefillKey: string }>();
  const [round, setRound] = useState(0);

  if (done && done.prefillKey === prefillKey) {
    return (
      <Screen testID="book-done">
        <Art art={illustrations.paintCan} style={styles.can} />
        {done.sent ? (
          <>
            <Heading level={1}>
              Your inspection request is <Accent>in</Accent>
            </Heading>
            <Body style={styles.block}>Shukriya! Our team will call you shortly to confirm a time for the site visit. Hours: {site.hoursDisplay}.</Body>
          </>
        ) : (
          <>
            <Heading level={1}>
              Almost <Accent>there</Accent>
            </Heading>
            <Body style={styles.block}>
              Your details are complete, but this test version of the app does not send bookings yet, so nothing has been sent. Please book on our website for now.
            </Body>
            <Button label="Book on paintsaathi.in" onPress={() => void Linking.openURL(webUrl("/book"))} style={styles.block} />
          </>
        )}
        <Button
          label="Start a new booking"
          variant="secondary"
          onPress={() => {
            setDone(undefined);
            setRound((r) => r + 1);
          }}
          style={styles.block}
        />
      </Screen>
    );
  }

  return (
    <Screen testID="book">
      <Art art={illustrations.paintCan} style={styles.can} />
      <Heading level={1}>
        Book a free <Accent>inspection</Accent>
      </Heading>
      <Body style={styles.block}>Share a few details and book a free site inspection. We'll call you back to confirm a convenient time for the visit.</Body>
      <Card style={styles.card}>
        <BookingForm key={`${round}:${prefillKey}`} prefill={prefill} onDone={({ sent }) => setDone({ sent, prefillKey })} />
      </Card>
      <ContactActions />

      <Section>
        <Heading>
          What happens <Accent>next</Accent>
        </Heading>
        <View style={styles.block}>
          <StepList steps={bookingSteps.slice(1)} />
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  can: { width: "56%", alignSelf: "center", marginBottom: 12 },
  block: { marginTop: 16 },
  card: { marginTop: 22, marginBottom: 16, padding: 18 },
});
