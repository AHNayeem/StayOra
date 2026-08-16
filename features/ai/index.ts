/**
 * AI feature barrel — everything the rest of the app is meant to touch.
 *
 * Product surfaces import from here only. The engine, tools and parser stay
 * private to the module, which is what lets the provider be replaced without a
 * single import elsewhere changing.
 */

export { AssistantProvider, useAssistant, useOptionalAssistant } from "./ui/assistant-provider";
export type { OpenAssistantOptions } from "./ui/assistant-provider";
export { AssistantLauncher } from "./ui/assistant-launcher";
export { AssistantPanel } from "./ui/assistant-panel";
export { AskAiButton } from "./ui/ask-ai-button";
export { AiConciergeSection } from "./ui/ai-concierge-section";
export { ChatView } from "./ui/chat-view";
export { SuggestionChips } from "./ui/suggestion-chips";
export {
  useSavedTrips,
  useSavedTripCount,
  removeSavedTrip,
  type SavedTrip,
} from "./saved-trips";
export { TOOL_DESCRIPTORS, permissionOf, type AIToolPermission } from "./tools/registry";
/**
 * The API cutover seam. Constructing an `Api*` bundle and calling
 * `setRepositories(...)` once at boot is the whole change — no tool, agent
 * action, block or component knows which implementation is active.
 */
export { getRepositories, setRepositories, type Repositories } from "./repositories";
export { DEFAULT_AGENT_POLICY, type AgentPolicy } from "./agent/policy";
export { BOOKING_STATE_LABEL } from "./agent/booking-machine";
