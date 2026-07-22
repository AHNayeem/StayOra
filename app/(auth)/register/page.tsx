import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthGate } from "@/components/auth";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your StayOra account to start booking.",
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<AuthGate />}>
      <RegisterForm />
    </Suspense>
  );
}
