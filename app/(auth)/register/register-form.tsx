"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { Mail, User } from "lucide-react";
import { useAuth, useRedirectIfAuthenticated } from "@/features/auth";
import { AuthCard, AuthGate, PasswordInput, SocialAuth } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  EMAIL_PATTERN,
  passwordRules,
  passwordStrength,
} from "@/features/auth/validation";

interface RegisterValues {
  name: string;
  email: string;
  password: string;
  confirm: string;
  agree: boolean;
}

const TONE_BAR: Record<string, string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  primary: "bg-primary",
};

/**
 * RegisterForm — create-account flow wired to the mock auth service. New
 * accounts start unverified with an incomplete profile, so on success we route
 * to profile completion (carrying any `?next=` through).
 */
export function RegisterForm() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const status = useRedirectIfAuthenticated(next);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    defaultValues: { name: "", email: "", password: "", confirm: "", agree: false },
  });

  const password = watch("password");
  const strength = passwordStrength(password ?? "");

  if (status === "authenticated") return <AuthGate label="Setting up your account…" />;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerUser({ name: values.name, email: values.email, password: values.password });
      toast.success("Account created — welcome to StayOra!");
      const dest = `/complete-profile${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;
      router.replace(dest);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to create account.");
    }
  });

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join StayOra to book faster and keep every trip in one place."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className="font-semibold text-primary hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          type="text"
          label="Full name"
          autoComplete="name"
          placeholder="Jane Doe"
          leftIcon={<User className="size-4" aria-hidden="true" />}
          error={errors.name?.message}
          {...register("name", {
            required: "Name is required",
            minLength: { value: 2, message: "Enter your full name" },
          })}
        />

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

        <div>
          <PasswordInput
            label="Password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            error={errors.password?.message}
            {...register("password", passwordRules)}
          />
          {password && !errors.password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex flex-1 gap-1" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      i < strength.score ? TONE_BAR[strength.tone] : "bg-line",
                    )}
                  />
                ))}
              </div>
              <span className="text-xs font-medium text-muted">{strength.label}</span>
            </div>
          )}
        </div>

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

        <Checkbox
          label={
            <>
              I agree to the{" "}
              <Link href="/terms-and-conditions" className="text-primary hover:underline">
                Terms
              </Link>{" "}
              &{" "}
              <Link href="/terms-and-conditions" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </>
          }
          {...register("agree", { required: "Please accept the terms to continue" })}
        />
        {errors.agree && (
          <p className="-mt-2 text-xs text-danger" role="alert">
            {errors.agree.message}
          </p>
        )}

        <Button type="submit" fullWidth loading={isSubmitting}>
          Create account
        </Button>
      </form>

      <SocialAuth action="sign up" />
    </AuthCard>
  );
}
