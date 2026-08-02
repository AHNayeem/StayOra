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
import { statusOptions } from "../../lib/status";
import { AIRLINES } from "@/lib/mock/airlines";
import { AIRPORTS } from "@/lib/mock/airports";
import { AIRCRAFT } from "@/lib/mock/airlines";
import {
  airlineSchema,
  airportSchema,
  routeSchema,
  scheduleSchema,
  type AirlineFormValues,
  type AirportFormValues,
  type RouteFormValues,
  type ScheduleFormValues,
} from "./schemas";
import {
  useCreateAirline,
  useCreateAirport,
  useCreateRoute,
  useCreateSchedule,
  useUpdateAirline,
  useUpdateAirport,
  useUpdateRoute,
  useUpdateSchedule,
} from "./hooks";
import {
  AIRLINE_STATUSES,
  AIRPORT_STATUSES,
  ALLIANCE_VALUES,
  ROUTE_STATUSES,
  SCHEDULE_STATUSES,
  type AdminAirline,
  type AdminAirport,
  type AdminRoute,
  type AdminSchedule,
} from "./types";

/**
 * Drawer forms for the four editable flight resources.
 *
 * Airline and airport codes are offered as dropdowns sourced from the *live
 * reference data* rather than free-text boxes wherever a record has to join
 * against them — a route pointing at an airport code that doesn't exist is a
 * broken row the search engine will silently skip.
 */

const AIRLINE_OPTIONS = AIRLINES.map((a) => ({
  value: a.code,
  label: `${a.code} · ${a.name}`,
}));

const AIRPORT_OPTIONS = AIRPORTS.map((a) => ({
  value: a.code,
  label: `${a.code} · ${a.city}`,
}));

const AIRCRAFT_OPTIONS = AIRCRAFT.map((a) => ({ value: a.name, label: a.name }));

const ALLIANCE_OPTIONS = ALLIANCE_VALUES.map((v) => ({
  value: v,
  label: v === "None" ? "Independent" : v,
}));

const BOOLEAN_OPTIONS = [
  { value: "false", label: "Full service" },
  { value: "true", label: "Low cost" },
];

interface FormProps<T> {
  /** Present ⇒ edit mode. */
  initial?: T;
  onDone: () => void;
  onCancel: () => void;
}

/* ------------------------------- Airlines --------------------------------- */

export function AirlineForm({ initial, onDone, onCancel }: FormProps<AdminAirline>) {
  const create = useCreateAirline();
  const update = useUpdateAirline();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(airlineSchema, {
    defaultValues: {
      code: initial?.code ?? "",
      name: initial?.name ?? "",
      country: initial?.country ?? "",
      alliance: initial?.alliance ?? "None",
      fleetSize: initial?.fleetSize ?? 0,
      commissionPct: initial?.commissionPct ?? 5,
      lowCost: initial?.lowCost ?? false,
      status: initial?.status ?? "active",
    },
  });

  const onSubmit = form.handleSubmit(async (values: AirlineFormValues) => {
    setSubmitError(null);
    try {
      if (initial) await update.mutateAsync({ id: initial.id, input: values });
      else await create.mutateAsync(values);
      onDone();
    } catch (error) {
      if (!applyServerErrors(form.setError, error)) {
        setSubmitError(getErrorMessage(error));
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-card border border-line bg-surface px-6 py-2">
      {submitError && (
        <Alert tone="danger" title="Couldn't save airline" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Carrier" description="Identity and alliance membership.">
        <FormGrid cols={2}>
          <Input
            label="IATA code"
            required
            hint="Two characters, e.g. EK"
            className="uppercase"
            {...form.register("code")}
            error={form.formState.errors.code?.message}
          />
          <Input
            label="Airline name"
            required
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <Input
            label="Country"
            required
            {...form.register("country")}
            error={form.formState.errors.country?.message}
          />
          <Select
            label="Alliance"
            options={ALLIANCE_OPTIONS}
            {...form.register("alliance")}
            error={form.formState.errors.alliance?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Commercial" description="Fleet size, model and our commission.">
        <FormGrid cols={2}>
          <Input
            label="Fleet size"
            type="number"
            min={0}
            {...form.register("fleetSize")}
            error={form.formState.errors.fleetSize?.message}
          />
          <Input
            label="Commission (%)"
            type="number"
            min={0}
            max={100}
            step="0.1"
            {...form.register("commissionPct")}
            error={form.formState.errors.commissionPct?.message}
          />
          <Select
            label="Carrier type"
            options={BOOLEAN_OPTIONS}
            {...form.register("lowCost")}
            error={form.formState.errors.lowCost?.message}
          />
          <Select
            label="Status"
            options={statusOptions(AIRLINE_STATUSES)}
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
          {initial ? "Save changes" : "Add airline"}
        </Button>
      </FormActions>
    </form>
  );
}

/* ------------------------------- Airports --------------------------------- */

export function AirportForm({ initial, onDone, onCancel }: FormProps<AdminAirport>) {
  const create = useCreateAirport();
  const update = useUpdateAirport();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(airportSchema, {
    defaultValues: {
      code: initial?.code ?? "",
      name: initial?.name ?? "",
      city: initial?.city ?? "",
      country: initial?.country ?? "",
      countryCode: initial?.countryCode ?? "",
      timezone: initial?.timezone ?? "",
      terminals: initial?.terminals ?? 1,
      status: initial?.status ?? "active",
    },
  });

  const onSubmit = form.handleSubmit(async (values: AirportFormValues) => {
    setSubmitError(null);
    try {
      if (initial) await update.mutateAsync({ id: initial.id, input: values });
      else await create.mutateAsync(values);
      onDone();
    } catch (error) {
      if (!applyServerErrors(form.setError, error)) {
        setSubmitError(getErrorMessage(error));
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-card border border-line bg-surface px-6 py-2">
      {submitError && (
        <Alert tone="danger" title="Couldn't save airport" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Airport" description="Code, name and location.">
        <FormGrid cols={2}>
          <Input
            label="IATA code"
            required
            hint="Three letters, e.g. DAC"
            className="uppercase"
            {...form.register("code")}
            error={form.formState.errors.code?.message}
          />
          <Input
            label="Airport name"
            required
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <Input
            label="City"
            required
            {...form.register("city")}
            error={form.formState.errors.city?.message}
          />
          <Input
            label="Country"
            required
            {...form.register("country")}
            error={form.formState.errors.country?.message}
          />
          <Input
            label="Country code"
            required
            hint="ISO 3166-1 alpha-2, e.g. BD"
            className="uppercase"
            {...form.register("countryCode")}
            error={form.formState.errors.countryCode?.message}
          />
          <Input
            label="Timezone"
            required
            hint="IANA name, e.g. Asia/Dhaka"
            {...form.register("timezone")}
            error={form.formState.errors.timezone?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Operations" description="Terminal count and availability.">
        <FormGrid cols={2}>
          <Input
            label="Terminals"
            type="number"
            min={1}
            {...form.register("terminals")}
            error={form.formState.errors.terminals?.message}
          />
          <Select
            label="Status"
            options={statusOptions(AIRPORT_STATUSES)}
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
          {initial ? "Save changes" : "Add airport"}
        </Button>
      </FormActions>
    </form>
  );
}

/* -------------------------------- Routes ---------------------------------- */

export function RouteForm({ initial, onDone, onCancel }: FormProps<AdminRoute>) {
  const create = useCreateRoute();
  const update = useUpdateRoute();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(routeSchema, {
    defaultValues: {
      originCode: initial?.originCode ?? "DAC",
      destinationCode: initial?.destinationCode ?? "",
      airlineCode: initial?.airlineCode ?? "BG",
      distanceKm: initial?.distanceKm ?? 0,
      durationMinutes: initial?.durationMinutes ?? 120,
      weeklyFrequency: initial?.weeklyFrequency ?? 7,
      fromUsd: initial?.fromUsd ?? 0,
      status: initial?.status ?? "active",
    },
  });

  const onSubmit = form.handleSubmit(async (values: RouteFormValues) => {
    setSubmitError(null);
    try {
      if (initial) await update.mutateAsync({ id: initial.id, input: values });
      else await create.mutateAsync(values);
      onDone();
    } catch (error) {
      if (!applyServerErrors(form.setError, error)) {
        setSubmitError(getErrorMessage(error));
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-card border border-line bg-surface px-6 py-2">
      {submitError && (
        <Alert tone="danger" title="Couldn't save route" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Route" description="City pair and operating carrier.">
        <FormGrid cols={2}>
          <Select
            label="Origin"
            options={AIRPORT_OPTIONS}
            {...form.register("originCode")}
            error={form.formState.errors.originCode?.message}
          />
          <Select
            label="Destination"
            options={AIRPORT_OPTIONS}
            {...form.register("destinationCode")}
            error={form.formState.errors.destinationCode?.message}
          />
          <Select
            label="Carrier"
            options={AIRLINE_OPTIONS}
            {...form.register("airlineCode")}
            error={form.formState.errors.airlineCode?.message}
          />
          <Select
            label="Status"
            options={statusOptions(ROUTE_STATUSES)}
            {...form.register("status")}
            error={form.formState.errors.status?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Operations & pricing" description="Distance, block time, frequency and lead fare.">
        <FormGrid cols={2}>
          <Input
            label="Distance (km)"
            type="number"
            min={1}
            {...form.register("distanceKm")}
            error={form.formState.errors.distanceKm?.message}
          />
          <Input
            label="Block time (minutes)"
            type="number"
            min={20}
            {...form.register("durationMinutes")}
            error={form.formState.errors.durationMinutes?.message}
          />
          <Input
            label="Weekly frequency"
            type="number"
            min={0}
            max={140}
            {...form.register("weeklyFrequency")}
            error={form.formState.errors.weeklyFrequency?.message}
          />
          <Input
            label="Lowest fare (USD)"
            type="number"
            min={0}
            step="1"
            {...form.register("fromUsd")}
            error={form.formState.errors.fromUsd?.message}
          />
        </FormGrid>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={pending}>
          {initial ? "Save changes" : "Add route"}
        </Button>
      </FormActions>
    </form>
  );
}

/* ------------------------------- Schedules -------------------------------- */

const DAY_OPTIONS = [
  "Daily",
  "Mon–Fri",
  "Mon, Wed, Fri",
  "Tue, Thu, Sat",
  "Sat, Sun",
  "Mon, Thu",
].map((v) => ({ value: v, label: v }));

export function ScheduleForm({ initial, onDone, onCancel }: FormProps<AdminSchedule>) {
  const create = useCreateSchedule();
  const update = useUpdateSchedule();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(scheduleSchema, {
    defaultValues: {
      flightNumber: initial?.flightNumber ?? "",
      airlineCode: initial?.airlineCode ?? "BG",
      originCode: initial?.originCode ?? "DAC",
      destinationCode: initial?.destinationCode ?? "",
      departLocal: initial?.departLocal ?? "",
      arriveLocal: initial?.arriveLocal ?? "",
      aircraft: initial?.aircraft ?? AIRCRAFT[0].name,
      operatingDays: initial?.operatingDays ?? "Daily",
      seatsTotal: initial?.seatsTotal ?? 180,
      seatsSold: initial?.seatsSold ?? 0,
      status: initial?.status ?? "scheduled",
    },
  });

  const onSubmit = form.handleSubmit(async (values: ScheduleFormValues) => {
    setSubmitError(null);
    try {
      if (initial) await update.mutateAsync({ id: initial.id, input: values });
      else await create.mutateAsync(values);
      onDone();
    } catch (error) {
      if (!applyServerErrors(form.setError, error)) {
        setSubmitError(getErrorMessage(error));
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-card border border-line bg-surface px-6 py-2">
      {submitError && (
        <Alert tone="danger" title="Couldn't save schedule" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Flight" description="Number, carrier and city pair.">
        <FormGrid cols={2}>
          <Input
            label="Flight number"
            required
            hint="e.g. BG 435"
            {...form.register("flightNumber")}
            error={form.formState.errors.flightNumber?.message}
          />
          <Select
            label="Carrier"
            options={AIRLINE_OPTIONS}
            {...form.register("airlineCode")}
            error={form.formState.errors.airlineCode?.message}
          />
          <Select
            label="Origin"
            options={AIRPORT_OPTIONS}
            {...form.register("originCode")}
            error={form.formState.errors.originCode?.message}
          />
          <Select
            label="Destination"
            options={AIRPORT_OPTIONS}
            {...form.register("destinationCode")}
            error={form.formState.errors.destinationCode?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection
        title="Timing"
        description="Local times at each airport — not UTC, and not the viewer's timezone."
      >
        <FormGrid cols={2}>
          <Input
            label="Departure (local)"
            type="datetime-local"
            required
            {...form.register("departLocal")}
            error={form.formState.errors.departLocal?.message}
          />
          <Input
            label="Arrival (local)"
            type="datetime-local"
            required
            {...form.register("arriveLocal")}
            error={form.formState.errors.arriveLocal?.message}
          />
          <Select
            label="Operating days"
            options={DAY_OPTIONS}
            {...form.register("operatingDays")}
            error={form.formState.errors.operatingDays?.message}
          />
          <Select
            label="Status"
            options={statusOptions(SCHEDULE_STATUSES)}
            {...form.register("status")}
            error={form.formState.errors.status?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Equipment & capacity" description="Aircraft type and seats.">
        <FormGrid cols={2}>
          <Select
            label="Aircraft"
            options={AIRCRAFT_OPTIONS}
            {...form.register("aircraft")}
            error={form.formState.errors.aircraft?.message}
          />
          <Input
            label="Seats total"
            type="number"
            min={1}
            {...form.register("seatsTotal")}
            error={form.formState.errors.seatsTotal?.message}
          />
          <Input
            label="Seats sold"
            type="number"
            min={0}
            {...form.register("seatsSold")}
            error={form.formState.errors.seatsSold?.message}
          />
        </FormGrid>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={pending}>
          {initial ? "Save changes" : "Add schedule"}
        </Button>
      </FormActions>
    </form>
  );
}
