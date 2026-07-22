"use client";

import { useForm } from "react-hook-form";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ContactValues {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SUBJECTS = [
  { label: "General enquiry", value: "general" },
  { label: "Booking support", value: "booking" },
  { label: "Payments & refunds", value: "payments" },
  { label: "Partnership", value: "partnership" },
  { label: "Something else", value: "other" },
];

/**
 * ContactForm — the enquiry form on `/contact-us`. Client-side only: React Hook
 * Form validates, then shows an inline success state (the submit handler is the
 * wiring point for a real endpoint — no backend yet).
 */
export function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitSuccessful, isSubmitting },
  } = useForm<ContactValues>({
    defaultValues: { name: "", email: "", phone: "", subject: "", message: "" },
  });

  const onSubmit = handleSubmit(async () => {
    // Simulate a network round-trip; swap for a real send call later.
    await new Promise((resolve) => setTimeout(resolve, 700));
  });

  if (isSubmitSuccessful) {
    return (
      <div
        role="status"
        className="flex flex-col items-center rounded-panel border border-line bg-surface p-10 text-center"
      >
        <span className="grid size-14 place-items-center rounded-full bg-primary-50 text-primary">
          <CheckCircle2 className="size-7" aria-hidden="true" />
        </span>
        <h3 className="text-h3 mt-5">Message sent</h3>
        <p className="mt-2 max-w-sm text-body">
          Thanks for reaching out — our team will get back to you within one
          business day.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => reset()}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-panel border border-line bg-surface p-6 md:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Full name"
          required
          autoComplete="name"
          placeholder="Jane Doe"
          error={errors.name?.message}
          {...register("name", { required: "Please enter your name." })}
        />
        <Input
          label="Email address"
          type="email"
          required
          autoComplete="email"
          placeholder="jane@example.com"
          error={errors.email?.message}
          {...register("email", {
            required: "Please enter your email address.",
            pattern: { value: EMAIL_PATTERN, message: "Enter a valid email address." },
          })}
        />
        <Input
          label="Phone"
          type="tel"
          autoComplete="tel"
          placeholder="Optional"
          {...register("phone")}
        />
        <Select
          label="Subject"
          required
          placeholder="Choose a topic"
          options={SUBJECTS}
          error={errors.subject?.message}
          {...register("subject", { required: "Please choose a subject." })}
        />
      </div>

      <Textarea
        label="Message"
        required
        rows={6}
        wrapperClassName="mt-5"
        placeholder="How can we help?"
        error={errors.message?.message}
        {...register("message", {
          required: "Please enter a message.",
          minLength: { value: 10, message: "Please add a little more detail." },
        })}
      />

      <Button
        type="submit"
        size="lg"
        className="mt-6"
        loading={isSubmitting}
        rightIcon={<Send className="size-4" aria-hidden="true" />}
      >
        Send message
      </Button>
    </form>
  );
}
