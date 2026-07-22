"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { Phone, User } from "lucide-react";
import { COUNTRIES } from "@/constants/geo";
import { useAuth, useRequireAuth } from "@/features/auth";
import { AuthCard, AuthGate } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "@/lib/toast";

interface ProfileValues {
  name: string;
  phone: string;
  country: string;
}

const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({
  value: c.code,
  label: `${c.flag} ${c.name}`,
}));

/**
 * CompleteProfileForm — the post-signup step that captures the details a
 * booking needs (name, phone, country). Auth-guarded; the profile is marked
 * complete once all three are set. Users can skip and finish later.
 */
export function CompleteProfileForm() {
  const { user, updateProfile } = useAuth();
  const { isResolving } = useRequireAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    values: {
      name: user?.name ?? "",
      phone: user?.phone ?? "",
      country: user?.country ?? "",
    },
  });

  if (isResolving || !user) return <AuthGate label="Loading your profile…" />;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateProfile({ name: values.name, phone: values.phone, country: values.country });
      toast.success("Profile complete — you're all set!");
      router.replace(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save your profile.");
    }
  });

  return (
    <AuthCard
      title="Complete your profile"
      subtitle="A few details so checkout is quick and your trips stay organised."
      footer={
        <Link href={next} className="font-medium text-muted hover:text-primary">
          Skip for now
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          type="text"
          label="Full name"
          autoComplete="name"
          leftIcon={<User className="size-4" aria-hidden="true" />}
          error={errors.name?.message}
          {...register("name", { required: "Name is required" })}
        />
        <Input
          type="tel"
          label="Phone number"
          autoComplete="tel"
          placeholder="+1 555 000 1234"
          leftIcon={<Phone className="size-4" aria-hidden="true" />}
          error={errors.phone?.message}
          {...register("phone", {
            required: "Phone number is required",
            minLength: { value: 6, message: "Enter a valid phone number" },
          })}
        />
        <Select
          label="Country"
          placeholder="Select your country"
          options={COUNTRY_OPTIONS}
          error={errors.country?.message}
          {...register("country", { required: "Please select your country" })}
        />
        <Button type="submit" fullWidth loading={isSubmitting}>
          Save & continue
        </Button>
      </form>
    </AuthCard>
  );
}
