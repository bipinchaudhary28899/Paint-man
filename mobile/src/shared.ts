// Everything the app takes from the website, in one place. These are the website's own modules
// (../src), not copies: services, cities and their localities, promises and FAQs (src/config/site.ts),
// the menus and footer link hub (nav.ts), photos and alt text (images.ts), the ideas gallery
// (gallery.ts), colour combinations (palettes.ts), the room the finder previews shades on
// (scenes.ts), and the booking form's checks, options, date range and job estimate (src/lib/leads).
// Change the facts there and both the site and the app follow. Add an export here when a screen
// needs another one; never copy website data into the app.

export {
  areaSlug,
  bookingFaqs,
  bookingSteps,
  cities,
  cityPath,
  generalFaqs,
  getCity,
  getService,
  homeCity,
  jobDuration,
  jobSize,
  liveCities,
  liveCityNames,
  promises,
  serviceCityTitle,
  servicePath,
  services,
  servicesIn,
  site,
  workFlow,
  type City,
  type CityWeather,
  type FaqItem,
  type Service,
  type ServiceLocal,
  type ServicePoint,
} from "@/config/site";
export { footerColumns, headerSection, menuLinks, navMenus, shadeCardBrands, shadeCardHref, type NavGroup, type NavLink, type NavMenu, type NavNode } from "@/config/nav";
export { illustrations, images, type Illustration, type SiteImage } from "@/config/images";
export { galleryGroups, type GalleryGroup, type GalleryPhoto } from "@/config/gallery";
export {
  finishes,
  getPalette,
  isRoom,
  paletteBrands,
  palettes,
  palettesForRoom,
  rooms,
  shadeDisplayName,
  type Finish,
  type Palette,
  type PaletteShade,
  type Room,
} from "@/config/palettes";
export { genericScene, photoScenes, type PhotoScene } from "@/config/scenes";
export { FIELD_MESSAGES, fieldProblem, isRequiredField, normalizeMobile, REQUIRED_FIELDS, requiredFieldErrors, type RequiredField } from "@/lib/leads/field-checks";
export { CARPET_AREA_MAX, CARPET_AREA_MIN, floorOptions, homeSizes, propertyTypes, serviceTypes } from "@/lib/leads/options";
export { BOOKING_DAYS_AHEAD, bookingDateRange, indiaToday, isCalendarDate } from "@/lib/leads/dates";
export { crewEstimate, estimatePaintArea, floorCount, formatSqft, PAINT_AREA_PER_CARPET_SQFT, SQFT_PER_PAINTER_DAY } from "@/lib/leads/estimate";
export { BRAND_SHADES_ROUNDED, PAINTDB } from "@/lib/colours/catalogue";
