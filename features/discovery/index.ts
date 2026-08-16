/**
 * Discovery feature — how a traveller finds a property before they choose one:
 * the prototype map, "near me" geolocation with its fallbacks, approximate
 * location filtering, and the compare tray.
 *
 * Everything here reads the existing catalogue and the existing inventory
 * domain. Nothing here stores a listing of its own.
 *
 *   UI → features/discovery → constants/listings + features/dashboard/domain
 */

export {
  DEFAULT_RADIUS_KM,
  DEMO_ORIGIN,
  DEMO_ORIGINS,
  RADIUS_OPTIONS,
  coordsFor,
  formatDistance,
  haversineKm,
  nearestPlace,
  type GeoOrigin,
  type LatLng,
} from "./geo";
export { ALL_LISTINGS, listingById, listingsByIds } from "./catalog-index";
export { NEAR_ME_MESSAGE, useNearMe, type NearMeStatus } from "./use-near-me";
export { LocationFilter } from "./location-filter";
export { ListingMap } from "./listing-map";
export { MapResults } from "./map-results";
export {
  COMPARE_LIMIT,
  clearCompare,
  removeFromCompare,
  toggleCompare,
  useCompareCount,
  useCompareIds,
  useIsComparing,
} from "./compare-store";
export { CompareButton } from "./compare-button";
export { CompareTray } from "./compare-tray";
export { CompareDialog } from "./compare-dialog";
export { SaveSearchButton, describeSearch } from "./save-search-button";
