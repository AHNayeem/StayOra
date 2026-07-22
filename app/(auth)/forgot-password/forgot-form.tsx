"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowLeft, Mail } from "lucide-react";
import { forgotPassword } from "@/services/auth";
import { AuthCard } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { EMAIL_PATTERN } from "@/features/auth/validation";

interface ForgotValues {
  email: string;
}

/**
 * ForgotForm — request a password-reset code. The mock service always reports
 * success (so we never reveal which emails exist); on success we forward to the
 * reset screen with the email prefilled.
 */
export function ForgotForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({ defaultValues: { email: "" } });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await forgotPassword(values.email);
      toast.success("If that email exists, we've sent a reset code.");
      router.push(`/reset-password?email=${encodeURIComponent(values.email)}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  });

  return (
    <AuthCard
      title="Forgot password?"
      subtitle="Enter the email tied to your account and we'll send a 6-digit reset code."
      footer={
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          type="email"
          label="Email"
          autoComplete="email"
          placeholder="you@example.com"
          leftIcon={<Mail className="size-4" aria-hidden="true" />}
          error={errors.email?.message}
          {...register("email", {
            required: "Email is required",
            pattern: { value: EMAIL_PATTERN, message: "Enter a valid email" },
          })}
        />
        <Button type="submit" fullWidth loading={isSubmitting}>
          Send reset code
        </Button>
      </form>
    </AuthCard>
  );
}
