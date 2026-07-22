import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthGate } from "@/components/auth";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Set a new password for your StayOra account.",
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthGate />}>
      <ResetForm />
    </Suspense>
  );
}
