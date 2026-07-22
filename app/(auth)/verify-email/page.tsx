import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthGate } from "@/components/auth";
import { VerifyEmailForm } from "./verify-form";

export const metadata: Metadata = {
  title: "Verify email",
  description: "Confirm your StayOra email address.",
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthGate />}>
      <VerifyEmailForm />
    </Suspense>
  );
}
