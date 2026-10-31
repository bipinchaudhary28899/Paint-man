import { StyleSheet } from "react-native";

import { BookingSection } from "~/components/site/Sections";
import { Em } from "~/components/ui/Text";
import { promises, site } from "~/shared";

// The booking form on the home page, after the areas we work in: the website's own LeadForm in the phone
// booking card, with the zero-advance note under the button. The hero's "Book a free inspection", the
// journey's "Book a site visit" and the sticky booking pill glide here (#book-visit).
export function HomeBooking() {
  return (
    <BookingSection
      style={styles.section}
      heading={
        <>
          Book a site visit <Em>online</Em>
        </>
      }
      text={`Bas kuch details bhejiye: we call you back during working hours (${site.hoursDisplay}) to fix the visit. The inspector measures your walls, brings shade cards and sends an itemised quotation.`}
      note={`${promises[0].title}, and nothing is booked until you approve the estimate.`}
    />
  );
}

const styles = StyleSheet.create({
  // the areas above end in 56pt of padding; the questions below start 6pt in
  section: { marginTop: 0, marginBottom: 50 },
});
