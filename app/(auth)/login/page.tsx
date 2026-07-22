import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthGate } from "@/components/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your StayOra account.",
};

/**
 * Login route. The form reads a `?next=` param via `useSearchParams`, so it's
 * wrapped in Suspense to keep the rest of the tree server-rendered.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<AuthGate />}>
      <LoginForm />
    </Suspense>
  );
}
