/**
 * Advertising module — merchant promotion and the revenue it generates.
 *
 * Not an ad network: no auction, no real-time serving. What is modelled is the
 * commercial side — advertiser, campaign, placement, budget, pricing model,
 * delivery, spend and billing — plus the storefront placements that render it.
 */
export { AdvertisingAdmin } from "./advertising-admin";
export { campaignColumns } from "./columns";
export {
  advertisingKeys,
  useAdvertisers,
  useAdvertisingSummary,
  useBillCampaign,
  useCampaigns,
  useCreateCampaign,
  useSetCampaignStatus,
  useUpdateCampaign,
} from "./hooks";
