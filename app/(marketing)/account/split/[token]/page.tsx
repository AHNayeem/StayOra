import type { Metadata } from "next";
import { SplitShareView } from "./split-view";

export const metadata: Metadata = {
  title: "Split payment",
  description: "Pay your share of a group booking.",
};

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SplitShareView token={token} />;
}
