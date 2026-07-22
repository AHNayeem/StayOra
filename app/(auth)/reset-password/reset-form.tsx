"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowLeft, MailCheck } from "lucide-react";
import { forgotPassword, MOCK_OTP, resetPassword, verifyOtp } from "@/services/auth";
import { AuthCard, OtpField, PasswordInput } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { passwordRules } from "@/features/auth/validation";

interface PasswordValues {
  password: string;
  confirm: string;
}

/**
 * ResetForm — the two-step reset: verify the 6-digit code, then set a new
 * password. The email is carried in via `?email=`; without it we send the
 * visitor back to request a code. Purely client state drives the step switch.
 */
export function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";

  const [step, setStep] = useState<"otp" | "password">("otp");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({ defaultValues: { password: "", confirm: "" } });

  if (!email) {
    return (
      <AuthCard
        title="Reset link expired"
        subtitle="We couldn't find which account to reset. Request a fresh code to continue."
        footer={
          <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
            Request a new code
          </Link>
        }
      >
        <span />
      </AuthCard>
    );
  }

  const handleVerify = async (value: string) => {
    setVerifying(true);
    setCodeError(false);
    try {
      const { valid } = await verifyOtp(value);
      if (valid) {
        setStep("password");
        toast.success("Code verified — choose a new password.");
      } else {
        setCodeError(true);
        toast.error("That code isn't right. Check and try again.");
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    await forgotPassword(email);
    toast.success("A new reset code is on its way.");
  };

  const onSubmitPassword = handleSubmit(async (values) => {
    try {
      await resetPassword(email, values.password);
      toast.success("Password updated. Please sign in.");
      router.replace("/login");
    } catch {
      toast.error("Couldn't reset your password. Please try again.");
    }
  });

  const password = watch("password");

  if (step === "otp") {
    return (
      <AuthCard
        title="Enter your code"
        subtitle={
          <>
            We sent a 6-digit code to <span className="font-medium text-ink">{email}</span>.
          </>
        }
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
        <div className="space-y-5">
          <OtpField
            value={code}
            onChange={(v) => {
              setCode(v);
              if (codeError) setCodeError(false);
            }}
            onComplete={handleVerify}
            error={codeError}
            autoFocus
          />

          <div className="flex items-center gap-1.5 rounded-field bg-primary-50 px-3 py-2 text-xs text-primary-700">
            <MailCheck className="size-4 shrink-0" aria-hidden="true" />
            Demo code: <span className="font-mono font-semibold">{MOCK_OTP}</span>
          </div>

          <Button
            type="button"
            fullWidth
            loading={verifying}
            disabled={code.length !== 6}
            onClick={() => handleVerify(code)}
          >
            Verify code
          </Button>

          <p className="text-center text-sm text-body">
            Didn&apos;t get it?{" "}
            <button
              type="button"
              onClick={handleResend}
              className="font-semibold text-primary hover:underline"
            >
              Resend code
            </button>
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Choose a strong password you haven't used before."
    >
      <form onSubmit={onSubmitPassword} className="space-y-4" noValidate>
        <PasswordInput
          label="New password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={errors.password?.message}
          {...register("password", passwordRules)}
        />
        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          error={errors.confirm?.message}
          {...register("confirm", {
            required: "Please confirm your password",
            validate: (value) => value === password || "Passwords don't match",
          })}
        />
        <Button type="submit" fullWidth loading={isSubmitting}>
          Update password
        </Button>
      </form>
    </AuthCard>
  );
}
