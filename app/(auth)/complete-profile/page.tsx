import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthGate } from "@/components/auth";
import { CompleteProfileForm } from "./complete-form";

export const metadata: Metadata = {
  title: "Complete profile",
  description: "Finish setting up your StayOra account.",
};

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={<AuthGate />}>
      <CompleteProfileForm />
    </Suspense>
  );
}
