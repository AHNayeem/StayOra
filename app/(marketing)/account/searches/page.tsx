import type { Metadata } from "next";
import { SavedSearchesView } from "./searches-view";

export const metadata: Metadata = {
  title: "Saved searches",
  description: "Searches you've kept, and the price alerts watching them.",
};

export default function Page() {
  return <SavedSearchesView />;
}
