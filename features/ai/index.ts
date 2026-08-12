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
export { TOOL_DESCRIPTORS } from "./tools/registry";
