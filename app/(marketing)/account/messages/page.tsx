import type { Metadata } from "next";
import { getThreads } from "@/services/account";
import { MessagesView } from "./messages-view";

export const metadata: Metadata = { title: "Messages" };

/** Conversations with hosts and support. */
export default async function MessagesPage() {
  const threads = await getThreads();
  return <MessagesView threads={threads} />;
}
