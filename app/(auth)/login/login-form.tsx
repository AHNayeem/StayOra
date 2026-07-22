"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { Mail } from "lucide-react";
import { useAuth, useRedirectIfAuthenticated } from "@/features/auth";
import { AuthCard, AuthGate, DemoHint, PasswordInput, SocialAuth } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { EMAIL_PATTERN } from "@/features/auth/validation";

interface LoginValues {
  email: string;
  password: string;
  remember: boolean;
}

/**
 * LoginForm — email/password sign-in wired to the mock auth service. On success
 * it honours a `?next=` redirect (set by the route guard) and otherwise returns
 * to the home page. Already-authenticated visitors are bounced out.
 */
export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const status = useRedirectIfAuthenticated(next);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    defaultValues: { email: "", password: "", remember: true },
  });

  if (status === "authenticated") return <AuthGate label="Signing you in…" />;

  const onSubmit = handleSubmit(async (values) => {
    try {
      const session = await login({ email: values.email, password: values.password });
      toast.success(`Welcome back, ${session.user.name.split(" ")[0]}!`);
      router.replace(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to sign in.");
    }
  });

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to manage your bookings, wishlists and trips."
      footer={
        <>
          New to StayOra?{" "}
          <Link
            href={next !== "/" ? `/register?next=${encodeURIComponent(next)}` : "/register"}
            className="font-semibold text-primary hover:underline"
          >
            Create an account
          </Link>
        </>
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

        <PasswordInput
          label="Password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register("password", { required: "Password is required" })}
        />

        <div className="flex items-center justify-between">
          <Checkbox label="Remember me" {...register("remember")} />
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth loading={isSubmitting}>
          Sign in
        </Button>
      </form>

      <SocialAuth />

      <div className="mt-6">
        <DemoHint
          onPick={({ email, password }) => {
            setValue("email", email, { shouldValidate: true });
            setValue("password", password, { shouldValidate: true });
            toast.info("Demo credentials filled — just hit Sign in.");
          }}
        />
      </div>
    </AuthCard>
  );
}
