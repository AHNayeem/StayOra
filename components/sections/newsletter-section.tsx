"use client";

import { useForm } from "react-hook-form";
import { CheckCircle2, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { HOME_NEWSLETTER } from "@/constants/home";

interface NewsletterValues {
  email: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * NewsletterSection — the closing sign-up band. Client-side only: React Hook
 * Form validates the email and shows an inline success state (no backend yet —
 * the submit handler is the wiring point for a real API). Brand-green gradient
 * panel to punctuate the page before the footer.
 */
export function NewsletterSection() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitSuccessful, isSubmitting },
  } = useForm<NewsletterValues>({ defaultValues: { email: "" } });

  const onSubmit = handleSubmit(async () => {
    // Simulate a network round-trip; swap for a real subscribe call later.
    await new Promise((resolve) => setTimeout(resolve, 600));
    reset();
  });

  return (
    <section className="py-16 md:py-24">
      <Container>
        <div className="relative overflow-hidden rounded-panel bg-linear-to-br from-primary-700 via-primary to-primary-600 px-6 py-12 text-center text-white md:px-14 md:py-16">
          <div className="pointer-events-none absolute -bottom-16 -left-10 size-64 rounded-full bg-white/10 blur-2xl" />

          <div className="relative mx-auto max-w-2xl">
            <p className="text-sm font-medium tracking-wide text-white/90 uppercase">
              {HOME_NEWSLETTER.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">
              {HOME_NEWSLETTER.title}
            </h2>
            <p className="mt-3 text-white/85">{HOME_NEWSLETTER.description}</p>

            {isSubmitSuccessful ? (
              <p
                role="status"
                className="mt-8 inline-flex items-center gap-2 rounded-pill bg-white/15 px-5 py-3 font-medium"
              >
                <CheckCircle2 className="size-5" aria-hidden="true" />
                You&apos;re subscribed — check your inbox to confirm.
              </p>
            ) : (
              <form onSubmit={onSubmit} noValidate className="mx-auto mt-8 max-w-md">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex flex-1 items-center gap-2 rounded-pill bg-white px-4 focus-within:ring-2 focus-within:ring-white/70">
                    <Mail className="size-4 shrink-0 text-muted" aria-hidden="true" />
                    <label htmlFor="newsletter-email" className="sr-only">
                      Email address
                    </label>
                    <input
                      id="newsletter-email"
                      type="email"
                      placeholder="Enter your email"
                      autoComplete="email"
                      aria-invalid={errors.email ? "true" : undefined}
                      className="h-12 w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                      {...register("email", {
                        required: "Please enter your email address.",
                        pattern: {
                          value: EMAIL_PATTERN,
                          message: "Please enter a valid email address.",
                        },
                      })}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="secondary"
                    size="lg"
                    loading={isSubmitting}
                    rightIcon={<Send className="size-4" aria-hidden="true" />}
                  >
                    Subscribe
                  </Button>
                </div>
                {errors.email && (
                  <p role="alert" className="mt-2 text-left text-sm text-white">
                    {errors.email.message}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
