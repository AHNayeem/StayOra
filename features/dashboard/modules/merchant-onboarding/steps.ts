/**
 * The onboarding wizard's step registry.
 *
 * The steps map 1:1 onto the domain checklist ids, so "which step is next" is
 * always answered by {@link import("@/features/dashboard/domain").onboardingProgress}
 * rather than by the wizard keeping its own idea of progress.
 */

import type { OnboardingStepId } from "@/features/dashboard/domain";

export const WIZARD_STEPS = [
  "business",
  "contact",
  "documents",
  "kyc",
  "contract",
  "bank",
  "review",
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number];

export interface WizardStep {
  id: WizardStepId;
  label: string;
  title: string;
  description: string;
  /** Checklist item this step completes; `null` for the review summary. */
  checklistId: OnboardingStepId | null;
}

export const WIZARD_STEP_LIST: WizardStep[] = [
  {
    id: "business",
    label: "Business",
    title: "Business profile",
    description: "Your legal entity, registration details and what you supply.",
    checklistId: "business_profile",
  },
  {
    id: "contact",
    label: "Contact",
    title: "Contact details",
    description: "Who we contact about bookings, compliance and payouts.",
    checklistId: "contact_details",
  },
  {
    id: "documents",
    label: "Documents",
    title: "Business documents",
    description: "Upload the paperwork our compliance team needs to see.",
    checklistId: "documents",
  },
  {
    id: "kyc",
    label: "Verification",
    title: "Verification (KYC)",
    description: "Declare the people who own and control the business.",
    checklistId: "kyc",
  },
  {
    id: "contract",
    label: "Terms",
    title: "Commercial terms",
    description: "The partner agreement, commission and payout terms.",
    checklistId: "contract",
  },
  {
    id: "bank",
    label: "Payout",
    title: "Payout details",
    description: "Where your settlements are paid, and how often.",
    checklistId: "bank_details",
  },
  {
    id: "review",
    label: "Review",
    title: "Review & submit",
    description: "Check everything, then send your application for review.",
    checklistId: null,
  },
];

export function isWizardStep(value: string | null | undefined): value is WizardStepId {
  return WIZARD_STEPS.includes(value as WizardStepId);
}
