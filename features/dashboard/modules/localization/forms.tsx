"use client";

import { useState } from "react";
import { getErrorMessage } from "../../data";
import { useZodForm, applyServerErrors } from "../../forms";
import {
  Alert,
  Button,
  FormActions,
  FormGrid,
  FormSection,
  Input,
  Select,
} from "../../ui";
import {
  currencySchema,
  languageSchema,
  type CurrencyFormValues,
  type LanguageFormValues,
} from "./schemas";
import {
  useCreateCurrency,
  useCreateLanguage,
  useUpdateCurrency,
  useUpdateLanguage,
} from "./hooks";
import type { Currency, Language } from "./types";

const STATUS_OPTIONS = [
  { value: "enabled", label: "Enabled" },
  { value: "disabled", label: "Disabled" },
];
const DIRECTION_OPTIONS = [
  { value: "ltr", label: "LTR (left-to-right)" },
  { value: "rtl", label: "RTL (right-to-left)" },
];

interface FormProps<T> {
  initial?: T;
  onDone: () => void;
  onCancel: () => void;
}

/** LanguageForm — friendly inputs mapped to the stored {@link Language} shape. */
export function LanguageForm({ initial, onDone, onCancel }: FormProps<Language>) {
  const create = useCreateLanguage();
  const update = useUpdateLanguage();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(languageSchema, {
    defaultValues: {
      code: initial?.code ?? "",
      name: initial?.name ?? "",
      nativeName: initial?.nativeName ?? "",
      direction: initial?.rtl ? "rtl" : "ltr",
      coverage: initial ? Math.round(initial.coverage * 100) : 100,
      status: initial && !initial.enabled ? "disabled" : "enabled",
    },
  });

  const onSubmit = form.handleSubmit(async (values: LanguageFormValues) => {
    setSubmitError(null);
    const payload = {
      code: values.code,
      name: values.name,
      nativeName: values.nativeName,
      rtl: values.direction === "rtl",
      coverage: values.coverage / 100,
      enabled: values.status === "enabled",
    };
    try {
      if (initial) await update.mutateAsync({ id: initial.id, input: payload });
      else await create.mutateAsync(payload);
      onDone();
    } catch (error) {
      if (!applyServerErrors(form.setError, error)) {
        setSubmitError(getErrorMessage(error));
      }
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-card border border-line bg-surface px-6 py-2"
    >
      {submitError && (
        <Alert tone="danger" title="Couldn't save language" className="my-4">
          {submitError}
        </Alert>
      )}
      <FormSection title="Language" description="Name, code and script direction.">
        <FormGrid cols={2}>
          <Input
            label="Name"
            required
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <Input
            label="Native name"
            required
            {...form.register("nativeName")}
            error={form.formState.errors.nativeName?.message}
          />
          <Input
            label="Code"
            required
            className="font-mono lowercase"
            hint="e.g. en, fr, ar"
            {...form.register("code")}
            error={form.formState.errors.code?.message}
          />
          <Select
            label="Direction"
            options={DIRECTION_OPTIONS}
            {...form.register("direction")}
            error={form.formState.errors.direction?.message}
          />
        </FormGrid>
      </FormSection>
      <FormSection title="Rollout" description="Translation coverage and availability.">
        <FormGrid cols={2}>
          <Input
            label="Coverage (%)"
            type="number"
            min={0}
            max={100}
            {...form.register("coverage")}
            error={form.formState.errors.coverage?.message}
          />
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            {...form.register("status")}
            error={form.formState.errors.status?.message}
          />
        </FormGrid>
      </FormSection>
      <FormActions>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={pending}>
          {initial ? "Save changes" : "Add language"}
        </Button>
      </FormActions>
    </form>
  );
}

/** CurrencyForm — friendly inputs mapped to the stored {@link Currency} shape. */
export function CurrencyForm({ initial, onDone, onCancel }: FormProps<Currency>) {
  const create = useCreateCurrency();
  const update = useUpdateCurrency();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(currencySchema, {
    defaultValues: {
      code: initial?.code ?? "",
      name: initial?.name ?? "",
      symbol: initial?.symbol ?? "",
      rate: initial?.rate ?? 1,
      status: initial && !initial.enabled ? "disabled" : "enabled",
    },
  });

  const onSubmit = form.handleSubmit(async (values: CurrencyFormValues) => {
    setSubmitError(null);
    const payload = {
      code: values.code,
      name: values.name,
      symbol: values.symbol,
      rate: values.rate,
      enabled: values.status === "enabled",
    };
    try {
      if (initial) await update.mutateAsync({ id: initial.id, input: payload });
      else await create.mutateAsync(payload);
      onDone();
    } catch (error) {
      if (!applyServerErrors(form.setError, error)) {
        setSubmitError(getErrorMessage(error));
      }
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-card border border-line bg-surface px-6 py-2"
    >
      {submitError && (
        <Alert tone="danger" title="Couldn't save currency" className="my-4">
          {submitError}
        </Alert>
      )}
      <FormSection title="Currency" description="Code, name and symbol.">
        <FormGrid cols={2}>
          <Input
            label="Name"
            required
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <Input
            label="Code"
            required
            className="font-mono uppercase"
            hint="ISO 4217, e.g. USD"
            {...form.register("code")}
            error={form.formState.errors.code?.message}
          />
          <Input
            label="Symbol"
            required
            {...form.register("symbol")}
            error={form.formState.errors.symbol?.message}
          />
          <Input
            label="Rate (to base)"
            type="number"
            min={0}
            step="0.0001"
            {...form.register("rate")}
            error={form.formState.errors.rate?.message}
          />
        </FormGrid>
      </FormSection>
      <FormSection title="Availability" description="Whether shoppers can use it.">
        <FormGrid cols={2}>
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            {...form.register("status")}
            error={form.formState.errors.status?.message}
          />
        </FormGrid>
      </FormSection>
      <FormActions>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={pending}>
          {initial ? "Save changes" : "Add currency"}
        </Button>
      </FormActions>
    </form>
  );
}
