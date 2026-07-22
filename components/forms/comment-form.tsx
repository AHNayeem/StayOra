"use client";

import { useForm } from "react-hook-form";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface CommentValues {
  name: string;
  email: string;
  comment: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * CommentForm — the "leave a comment" form under a blog article. Client-side
 * only: validates with React Hook Form and shows an inline confirmation (submit
 * is a front-end stub, ready to wire to a real endpoint).
 */
export function CommentForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitSuccessful, isSubmitting },
  } = useForm<CommentValues>({
    defaultValues: { name: "", email: "", comment: "" },
  });

  const onSubmit = handleSubmit(async () => {
    await new Promise((resolve) => setTimeout(resolve, 600));
  });

  if (isSubmitSuccessful) {
    return (
      <p
        role="status"
        className="inline-flex items-center gap-2 rounded-field bg-primary-50 px-5 py-3 text-sm font-medium text-primary-700"
      >
        <CheckCircle2 className="size-5" aria-hidden="true" />
        Thanks — your comment has been submitted for review.
        <button
          type="button"
          onClick={() => reset()}
          className="ml-1 underline underline-offset-2"
        >
          Add another
        </button>
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Name"
          required
          autoComplete="name"
          placeholder="Your name"
          error={errors.name?.message}
          {...register("name", { required: "Please enter your name." })}
        />
        <Input
          label="Email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          hint="Your email won't be published."
          error={errors.email?.message}
          {...register("email", {
            required: "Please enter your email address.",
            pattern: { value: EMAIL_PATTERN, message: "Enter a valid email address." },
          })}
        />
      </div>

      <Textarea
        label="Comment"
        required
        rows={5}
        wrapperClassName="mt-5"
        placeholder="Share your thoughts…"
        error={errors.comment?.message}
        {...register("comment", {
          required: "Please enter a comment.",
          minLength: { value: 5, message: "Please add a little more." },
        })}
      />

      <Button
        type="submit"
        className="mt-6"
        loading={isSubmitting}
        rightIcon={<Send className="size-4" aria-hidden="true" />}
      >
        Post comment
      </Button>
    </form>
  );
}
