import type { Metadata } from "next";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Reset your Otithee password.",
};

export default function ForgotPasswordPage() {
  return <ForgotForm />;
}
