import { BookingSection } from "@/components/BookingSection";
import { promises, site } from "@/config/site";

// The booking form on the home page, first thing after the hero. The zero-advance note sits under the
// text on tablets and desktops, and under the submit button on phones.
export function HomeBooking() {
  return (
    <BookingSection
      className="container-page relative z-[1] mt-0 mb-9 pt-4 tab:mb-20 tab:pt-6 desk:mb-24 desk:pt-0"
      heading={<>Book a site visit <em>online</em></>}
      text={
        <p>
          Share a few details and we call you back during working hours ({site.hoursDisplay}) to fix the visit. The inspector
          measures your walls, brings shade cards and sends an itemised quotation.
        </p>
      }
      note={<>{promises[0].title}, and nothing is booked until you approve the estimate.</>}
    />
  );
}
