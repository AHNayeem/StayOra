/**
 * Offers module — offer rules and combo bundles.
 *
 * Both read the domain's offer engine, so a rule authored here evaluates
 * identically in the dashboard preview, at checkout and when a booking is priced.
 */
export * from "./types";
export { offerSchema, comboSchema } from "./schemas";
export type { OfferValues, ComboValues } from "./schemas";
export { offerColumns, comboColumns } from "./columns";
export {
  offerKeys,
  useOffers,
  useCreateOffer,
  useUpdateOffer,
  useDeleteOffer,
  useCombos,
  useCreateCombo,
  useUpdateCombo,
  useDeleteCombo,
} from "./hooks";
export { OfferForm } from "./offer-form";
export { OffersList } from "./offers-list";
export { ComboForm } from "./combo-form";
export { CombosList } from "./combos-list";
