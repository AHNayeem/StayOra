/**
 * Insurance module — demo attach products, the policies sold and the margin.
 *
 * The plans here are prototype products: no underwriter is involved and no
 * cover exists. The money model is real though — premium → provider share →
 * platform commission — and it flows through the same money engine as merchant
 * commission.
 */
export { InsuranceAdmin } from "./insurance-admin";
export {
  insuranceKeys,
  useInsurancePlans,
  useInsurancePolicies,
  useInsuranceSummary,
  useUpdateInsurancePlan,
} from "./hooks";
