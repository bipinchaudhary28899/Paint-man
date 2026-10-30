// Everything the app takes from the website, in one place. These are the website's own modules
// (../src), not copies: services, cities and their localities, promises and FAQs come from
// src/config/site.ts, and the booking form uses the same field checks, options, date range and job
// estimate as the site's LeadForm. Change the facts there and both the site and the app follow.

export {
  areaSlug,
  bookingFaqs,
  bookingSteps,
  cities,
  generalFaqs,
  getCity,
  getService,
  homeCity,
  liveCities,
  liveCityNames,
  promises,
  services,
  servicesIn,
  site,
  workFlow,
  type City,
  type FaqItem,
  type Service,
  type ServiceLocal,
  type ServicePoint,
} from "@/config/site";
export { illustrations, images, type Illustration, type SiteImage } from "@/config/images";
export { FIELD_MESSAGES, fieldProblem, normalizeMobile, REQUIRED_FIELDS, requiredFieldErrors, type RequiredField } from "@/lib/leads/field-checks";
export { CARPET_AREA_MAX, CARPET_AREA_MIN, floorOptions, homeSizes, propertyTypes, serviceTypes } from "@/lib/leads/options";
export { bookingDateRange, isCalendarDate } from "@/lib/leads/dates";
export { estimatePaintArea, formatSqft } from "@/lib/leads/estimate";
