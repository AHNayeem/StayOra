/**
 * Destinations — the canonical destination module.
 *
 *   UI  →  service  →  repository  →  mock store (seed + localStorage)
 *
 * Import from here rather than reaching into the files: the split between
 * service and repository is the seam a real API replaces, and consumers should
 * not care which side of it they are on.
 */

export type {
  Destination,
  DestinationInput,
  DestinationPatch,
  DestinationSeo,
  DestinationStatus,
} from "@/types/destination";
export { DESTINATION_STATUS_VALUES } from "@/types/destination";

export { DESTINATIONS_SEED } from "@/constants/destinations";

export { slugify, isValidSlug, uniqueSlug } from "./slug";
export { DESTINATIONS_HREF, destinationHref, destinationEditHref } from "./links";

export type { DestinationRepository } from "./repository";
export { createMockDestinationRepository, destinationRepository } from "./repository";

export type { DestinationQuery } from "./service";
export {
  archiveDestination,
  createDestination,
  deleteDestination,
  filterDestinations,
  getDestinationById,
  getDestinationBySlug,
  getDestinationBySlugSync,
  getDestinationCountries,
  getDestinations,
  getDestinationsSync,
  isDestinationSlugAvailable,
  publishDestination,
  setDestinationStatus,
  subscribeToDestinations,
  suggestDestinationSlug,
  unpublishDestination,
  updateDestination,
} from "./service";

export type { DestinationRelations, RelationOptions } from "./related";
export { destinationRelations, matchesDestination } from "./related";

export {
  useAllDestinations,
  useDestination,
  useDestinationCountries,
  useDestinations,
} from "./hooks";

export { DestinationDetailView } from "./ui/destination-detail-view";
export { DestinationsIndex } from "./ui/destinations-index";
export { DestinationResolver } from "./ui/destination-resolver";
