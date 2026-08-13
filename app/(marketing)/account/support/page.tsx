import type { Metadata } from "next";
import { SupportView } from "./support-view";

export const metadata: Metadata = {
  title: "Help & support",
  description: "Open a support request and follow the conversation with our team.",
};

/** The traveller's half of the shared support inbox. */
export default function SupportPage() {
  return <SupportView />;
}
