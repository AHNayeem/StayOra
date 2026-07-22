"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, MailCheck } from "lucide-react";
import { forgotPassword, MOCK_OTP, verifyOtp } from "@/services/auth";
import { useAuth, useRequireAuth } from "@/features/auth";
import { AuthCard, AuthGate, OtpField } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

/**
 * VerifyEmailForm — confirm ownership of the account email with a 6-digit code.
 * Auth-guarded. If the email is already verified we say so; otherwise a valid
 * code flips `emailVerified` via the auth service and returns the user onward.
 */
export function VerifyEmailForm() {
  const { user, verifyEmail } = useAuth();
  const { isResolving } = useRequireAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (isResolving || !user) return <AuthGate label="Loading…" />;

  if (user.emailVerified) {
    return (
      <AuthCard
        title="Email verified"
        subtitle="Your email address is already confirmed — you're good to go."
      >
        <div className="flex flex-col items-center gap-4 py-2">
          <CheckCircle2 className="size-12 text-primary" aria-hidden="true" />
          <Button onClick={() => router.replace(next)} fullWidth>
            Continue
          </Button>
        </div>
      </AuthCard>
    );
  }

  const handleVerify = async (value: string) => {
    setSubmitting(true);
    setError(false);
    try {
      const { valid } = await verifyOtp(value);
      if (!valid) {
        setError(true);
        toast.error("That code isn't right. Check and try again.");
        return;
      }
      await verifyEmail();
      toast.success("Email verified — thank you!");
      router.replace(next);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Verify your email"
      subtitle={
        <>
          Enter the 6-digit code we sent to{" "}
          <span className="font-medium text-ink">{user.email}</span>.
        </>
      }
      footer={
        <Link href={next} className="font-medium text-muted hover:text-primary">
          I&apos;ll do this later
        </Link>
      }
    >
      <div className="space-y-5">
        <OtpField
          value={code}
          onChange={(v) => {
            setCode(v);
            if (error) setError(false);
          }}
          onComplete={handleVerify}
          error={error}
          autoFocus
        />

        <div className="flex items-center gap-1.5 rounded-field bg-primary-50 px-3 py-2 text-xs text-primary-700">
          <MailCheck className="size-4 shrink-0" aria-hidden="true" />
          Demo code: <span className="font-mono font-semibold">{MOCK_OTP}</span>
        </div>

        <Button
          type="button"
          fullWidth
          loading={submitting}
          disabled={code.length !== 6}
          onClick={() => handleVerify(code)}
        >
          Verify email
        </Button>

        <p className="text-center text-sm text-body">
          Didn&apos;t get it?{" "}
          <button
            type="button"
            onClick={async () => {
              await forgotPassword(user.email);
              toast.success("A new code is on its way.");
            }}
            className="font-semibold text-primary hover:underline"
          >
            Resend code
          </button>
        </p>
      </div>
    </AuthCard>
  );
}
