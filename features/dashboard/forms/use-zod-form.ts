"use client";

import {
  useForm,
  type FieldValues,
  type Path,
  type UseFormProps,
  type UseFormReturn,
  type UseFormSetError,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { isApiError } from "../data/errors";

/**
 * `react-hook-form` pre-wired with a Zod resolver — the one entry point for
 * validated forms across the dashboard. Callers pass a schema and get a fully
 * typed form whose values are inferred from that schema, so field names and
 * validation stay in lockstep.
 *
 *   const form = useZodForm(loginSchema, { defaultValues: { email: "" } });
 */
export function useZodForm<Schema extends z.ZodType<FieldValues, FieldValues>>(
  schema: Schema,
  options?: Omit<
    UseFormProps<z.input<Schema>, unknown, z.output<Schema>>,
    "resolver"
  >,
): UseFormReturn<z.input<Schema>, unknown, z.output<Schema>> {
  return useForm<z.input<Schema>, unknown, z.output<Schema>>({
    ...options,
    resolver: zodResolver(schema),
  });
}

/**
 * Push a normalized {@link import("../data/errors").ApiError}'s field errors
 * onto a form after a failed submit, so server-side validation surfaces inline
 * on the right inputs. Unknown fields are ignored. Returns true if it handled a
 * validation error.
 */
export function applyServerErrors<TFieldValues extends FieldValues>(
  setError: UseFormSetError<TFieldValues>,
  error: unknown,
): boolean {
  if (!isApiError(error) || error.kind !== "validation" || !error.fieldErrors) {
    return false;
  }
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    if (messages.length === 0) continue;
    setError(field as Path<TFieldValues>, {
      type: "server",
      message: messages[0],
    });
  }
  return true;
}
