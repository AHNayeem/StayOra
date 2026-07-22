"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Lock, Mail, User, X } from "lucide-react";
import { siteConfig } from "@/constants/site";
import { useAuth } from "@/features/auth";
import { SocialAuth } from "@/components/auth";
import { useClickOutside } from "@/hooks/use-click-outside";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type AuthMode = "signin" | "signup";

interface AuthFormValues {
  name?: string;
  email: string;
  password: string;
}

interface AuthModalProps {
  onClose: () => void;
  /** Which tab to show first. Defaults to "signin". */
  initialMode?: AuthMode;
}

/**
 * AuthModal — the header's quick sign-in / sign-up shell. Tabbed, validated
 * with react-hook-form, and dismissible via overlay, close button, or Escape.
 * Submits through {@link useAuth} (the same mock service the full /login and
 * /register pages use); "Forgot password?" hands off to the reset flow.
 *
 * The parent mounts this only while the modal is open, so state initialises
 * fresh on every open (no open/close sync effects needed).
 */
export function AuthModal({ onClose, initialMode = "signin" }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { login, register: registerUser } = useAuth();

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>();

  useLockBodyScroll(true);
  useClickOutside(panelRef, onClose, true);

  // On mount, focus the first field and close on Escape.
  useEffect(() => {
    const id = window.setTimeout(
      () => setFocus(initialMode === "signup" ? "name" : "email"),
      50,
    );
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [initialMode, onClose, setFocus]);

  const isSignup = mode === "signup";

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isSignup) {
        await registerUser({
          name: values.name ?? "",
          email: values.email,
          password: values.password,
        });
        toast.success("Account created — welcome to StayOra!");
        onClose();
        router.push("/complete-profile");
      } else {
        const session = await login({
          email: values.email,
          password: values.password,
        });
        toast.success(`Welcome back, ${session.user.name.split(" ")[0]}!`);
        onClose();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    }
  });

  const goToForgot = () => {
    onClose();
    router.push("/forgot-password");
  };

  return (
    <div className="fixed inset-0 z-70 grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink/60" aria-hidden="true" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative w-full max-w-md overflow-hidden rounded-panel bg-surface shadow-menu"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-field text-muted transition-colors hover:bg-primary-50 hover:text-primary"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        <div className="px-7 pb-7 pt-8">
          <h2 id="auth-modal-title" className="text-h3">
            {isSignup ? "Create your account" : "Welcome back"}
          </h2>
          <p className="mt-1 text-sm text-body">
            {isSignup
              ? `Join ${siteConfig.name} to book faster and track your trips.`
              : "Sign in to manage your bookings and wishlists."}
          </p>

          {/* Tabs */}
          <div className="mt-6 grid grid-cols-2 rounded-pill bg-surface-muted p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-pill py-2 text-sm font-medium transition-colors",
                  mode === m
                    ? "bg-primary text-white shadow-card"
                    : "text-body hover:text-primary",
                )}
              >
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            {isSignup && (
              <Field
                icon={<User className="size-4" aria-hidden="true" />}
                label="Full name"
                error={errors.name?.message}
              >
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Jane Doe"
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                  {...register("name", {
                    required: isSignup ? "Name is required" : false,
                  })}
                />
              </Field>
            )}

            <Field
              icon={<Mail className="size-4" aria-hidden="true" />}
              label="Email"
              error={errors.email?.message}
            >
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email",
                  },
                })}
              />
            </Field>

            <Field
              icon={<Lock className="size-4" aria-hidden="true" />}
              label="Password"
              error={errors.password?.message}
            >
              <input
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                placeholder="••••••••"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                {...register("password", {
                  required: "Password is required",
                  minLength: { value: 6, message: "At least 6 characters" },
                })}
              />
            </Field>

            {!isSignup && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={goToForgot}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-pill bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
            >
              {isSignup ? "Create account" : "Sign in"}
            </button>
          </form>

          <SocialAuth action={isSignup ? "sign up" : "continue"} />
        </div>
      </div>
    </div>
  );
}

/** A labelled input shell with a leading icon and inline error message. */
function Field({
  icon,
  label,
  error,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <span
        className={cn(
          "flex items-center gap-2 rounded-field border bg-surface px-3.5 py-3 text-muted transition-colors focus-within:border-primary",
          error ? "border-danger" : "border-line",
        )}
      >
        {icon}
        {children}
      </span>
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}
