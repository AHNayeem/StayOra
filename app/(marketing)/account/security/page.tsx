import type { Metadata } from "next";
import { getSessions } from "@/services/account";
import { SecurityView } from "./security-view";

export const metadata: Metadata = { title: "Security" };

/** Account security — password, two-factor and active sessions. */
export default async function SecurityPage() {
  const sessions = await getSessions();
  return <SecurityView initialSessions={sessions} />;
}
