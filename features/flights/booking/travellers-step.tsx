"use client";

import { useMemo, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BadgeInfo,
  ChevronDown,
  CircleAlert,
  Plane,
  UserPlus,
  Users,
} from "lucide-react";
import type {
  FlightContact,
  FlightOffer,
  FlightPassenger,
  EmergencyContact,
  PassengerType,
  VisaRequirement,
} from "@/types/flight";
import { COUNTRIES } from "@/constants/geo";
import { AIRLINES } from "@/lib/mock/airlines";
import {
  GENDER_LABEL,
  PASSENGER_TITLES,
  PASSENGER_TYPE_HINT,
  PASSENGER_TYPE_LABEL,
} from "@/lib/mock/passengers";
import { dateOf } from "@/lib/flight-time";
import { useSavedTravelers } from "@/features/account/travelers-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { travellersSchema, type TravellersFormValues } from "./schemas";

interface TravellersStepProps {
  offer: FlightOffer;
  /** Pre-fill from a previous visit to this step. */
  initial?: TravellersFormValues;
  /** Signed-in traveller's details, used to seed the contact block. */
  defaults: { name: string; email: string; country?: string };
  visa?: VisaRequirement;
  onSubmit: (values: {
    passengers: FlightPassenger[];
    contact: FlightContact;
    emergencyContact?: EmergencyContact;
    raw: TravellersFormValues;
  }) => void;
}

/** Dialling codes offered for the contact number. */
const DIAL_CODES = [
  { value: "+880", label: "🇧🇩 +880" },
  { value: "+91", label: "🇮🇳 +91" },
  { value: "+971", label: "🇦🇪 +971" },
  { value: "+974", label: "🇶🇦 +974" },
  { value: "+966", label: "🇸🇦 +966" },
  { value: "+65", label: "🇸🇬 +65" },
  { value: "+60", label: "🇲🇾 +60" },
  { value: "+66", label: "🇹🇭 +66" },
  { value: "+44", label: "🇬🇧 +44" },
  { value: "+1", label: "🇺🇸 +1" },
];

const GENDER_OPTIONS = (["male", "female", "other"] as const).map((value) => ({
  value,
  label: GENDER_LABEL[value],
}));

const DOCUMENT_OPTIONS = [
  { value: "passport", label: "Passport" },
  { value: "national-id", label: "National ID" },
];

/** Expand the passenger counts into an ordered list of fare types. */
function passengerTypes(offer: FlightOffer): PassengerType[] {
  const { adults, children, infants } = offer.passengers;
  return [
    ...Array<PassengerType>(adults).fill("adult"),
    ...Array<PassengerType>(children).fill("child"),
    ...Array<PassengerType>(infants).fill("infant"),
  ];
}

/**
 * TravellersStep — passenger details and contact information.
 *
 * Validated with React Hook Form + Zod against the *journey*, not just the form:
 * ages have to match the fare type on the travel date and passports have to
 * outlast the trip (see `./schemas`). Those checks belong here because no
 * downstream step catches them, and discovering them at the airport is the
 * failure mode this whole step exists to prevent.
 *
 * Saved travellers can be applied in one click, which is the difference between
 * a 30-second repeat booking and a five-minute one for a family of four.
 */
export function TravellersStep({
  offer,
  initial,
  defaults,
  visa,
  onSubmit,
}: TravellersStepProps) {
  const savedTravelers = useSavedTravelers();
  const [openIndex, setOpenIndex] = useState(0);

  const types = useMemo(() => passengerTypes(offer), [offer]);
  const travelDate = dateOf(offer.slices[0].departLocal);
  const today = new Date().toISOString().slice(0, 10);

  const schema = useMemo(
    () => travellersSchema({ travelDate, today }),
    [travelDate, today],
  );

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm<TravellersFormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: initial ?? {
      passengers: types.map((type) => ({
        type,
        title: PASSENGER_TITLES[type][0],
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "male" as const,
        nationality: defaults.country ?? "BD",
        documentType: "passport" as const,
        documentNumber: "",
        documentExpiry: "",
        frequentFlyerAirline: "",
        frequentFlyerNumber: "",
      })),
      contact: {
        email: defaults.email,
        phoneCountryCode: "+880",
        phone: "",
        country: defaults.country ?? "BD",
        emergencyName: "",
        emergencyRelationship: "",
        emergencyPhoneCountryCode: "+880",
        emergencyPhone: "",
      },
    },
  });

  const { fields } = useFieldArray({ control, name: "passengers" });

  const countryOptions = useMemo(
    () => COUNTRIES.map((c) => ({ value: c.code, label: c.name })),
    [],
  );
  const airlineOptions = useMemo(
    () => [
      { value: "", label: "Select airline" },
      ...AIRLINES.map((a) => ({ value: a.code, label: a.name })),
    ],
    [],
  );

  /** Copy a saved traveller into a passenger row. */
  const applySaved = (index: number, travelerId: string) => {
    const traveler = savedTravelers.find((t) => t.id === travelerId);
    if (!traveler) return;
    const [first, ...rest] = traveler.fullName.trim().split(/\s+/);
    setValue(`passengers.${index}.firstName`, first ?? "", { shouldValidate: true });
    setValue(`passengers.${index}.lastName`, rest.join(" "), { shouldValidate: true });
    if (traveler.dateOfBirth) {
      setValue(`passengers.${index}.dateOfBirth`, traveler.dateOfBirth, {
        shouldValidate: true,
      });
    }
    if (traveler.nationality) {
      setValue(`passengers.${index}.nationality`, traveler.nationality);
    }
    if (traveler.passportNumber) {
      setValue(`passengers.${index}.documentNumber`, traveler.passportNumber, {
        shouldValidate: true,
      });
    }
    if (traveler.passportExpiry) {
      setValue(`passengers.${index}.documentExpiry`, traveler.passportExpiry, {
        shouldValidate: true,
      });
    }
  };

  const submit = handleSubmit((values) => {
    const passengers: FlightPassenger[] = values.passengers.map((p, i) => ({
      id: `pax_${i}_${p.lastName.toLowerCase().replace(/\W/g, "").slice(0, 6) || "traveller"}`,
      type: p.type,
      title: p.title,
      firstName: p.firstName.trim(),
      lastName: p.lastName.trim(),
      dateOfBirth: p.dateOfBirth,
      gender: p.gender,
      nationality: p.nationality,
      documentType: p.documentType,
      documentNumber: p.documentNumber.trim().toUpperCase(),
      documentExpiry: p.documentExpiry,
      frequentFlyerAirline: p.frequentFlyerAirline || undefined,
      frequentFlyerNumber: p.frequentFlyerNumber || undefined,
    }));

    const contact: FlightContact = {
      email: values.contact.email.trim(),
      phoneCountryCode: values.contact.phoneCountryCode,
      phone: values.contact.phone.trim(),
      country: values.contact.country,
    };

    const emergencyContact: EmergencyContact | undefined =
      values.contact.emergencyName && values.contact.emergencyPhone
        ? {
            name: values.contact.emergencyName.trim(),
            relationship: values.contact.emergencyRelationship?.trim() || "Contact",
            phoneCountryCode: values.contact.emergencyPhoneCountryCode || "+880",
            phone: values.contact.emergencyPhone.trim(),
          }
        : undefined;

    onSubmit({ passengers, contact, emergencyContact, raw: values });
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {/* Name-matching warning — stated once, up front. */}
      <div className="flex items-start gap-2.5 rounded-card border border-accent-200 bg-accent-50/50 p-4">
        <BadgeInfo className="mt-0.5 size-4 shrink-0 text-accent-600" aria-hidden="true" />
        <p className="text-sm text-body">
          <strong className="font-semibold text-ink">
            Names must match your travel document exactly.
          </strong>{" "}
          Airlines don&apos;t allow a booking to be transferred to someone else, and
          correcting a name after ticketing may incur a fee.
        </p>
      </div>

      {visa && visa.status !== "visa-free" && (
        <div className="flex items-start gap-2.5 rounded-card border border-line bg-surface p-4">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm text-body">
            <strong className="font-semibold text-ink">
              Entry requirements for {visa.destinationCountry}:
            </strong>{" "}
            {visa.note}{" "}
            {visa.href && (
              <a href={visa.href} className="font-medium text-primary hover:underline">
                See visa services
              </a>
            )}
          </p>
        </div>
      )}

      {/* ---- Passengers ---------------------------------------------------- */}
      {fields.map((field, index) => {
        const type = types[index] ?? "adult";
        const rowErrors = errors.passengers?.[index];
        const hasError = Boolean(rowErrors);
        const isOpen = openIndex === index;
        const unusedSaved = savedTravelers.filter((t) => t.fullName.trim());

        return (
          <section
            key={field.id}
            className={cn(
              "overflow-hidden rounded-card border bg-surface shadow-card",
              hasError && isSubmitted ? "border-danger" : "border-line",
            )}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? -1 : index)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 p-4 text-left"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-field bg-primary-50 text-primary">
                <Users className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">
                  Traveller {index + 1} · {PASSENGER_TYPE_LABEL[type]}
                </span>
                <span className="block text-xs text-muted">
                  {PASSENGER_TYPE_HINT[type]}
                </span>
              </span>
              {hasError && isSubmitted && (
                <Badge variant="danger" size="sm">
                  Check details
                </Badge>
              )}
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted transition-transform",
                  isOpen && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>

            {isOpen && (
              <div className="border-t border-line p-4">
                {unusedSaved.length > 0 && (
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted">
                      Use a saved traveller:
                    </span>
                    {unusedSaved.slice(0, 4).map((traveler) => (
                      <button
                        key={traveler.id}
                        type="button"
                        onClick={() => applySaved(index, traveler.id)}
                        className="inline-flex items-center gap-1.5 rounded-pill bg-surface-muted px-3 py-1.5 text-xs font-medium text-body transition-colors hover:bg-primary-50 hover:text-primary"
                      >
                        <UserPlus className="size-3.5" aria-hidden="true" />
                        {traveler.fullName}
                      </button>
                    ))}
                  </div>
                )}

                <input type="hidden" {...register(`passengers.${index}.type`)} />

                <div className="grid gap-4 sm:grid-cols-6">
                  <Controller
                    control={control}
                    name={`passengers.${index}.title`}
                    render={({ field: f }) => (
                      <Select
                        {...f}
                        label="Title"
                        wrapperClassName="sm:col-span-1"
                        options={PASSENGER_TITLES[type].map((t) => ({
                          value: t,
                          label: t,
                        }))}
                        error={rowErrors?.title?.message}
                      />
                    )}
                  />
                  <Input
                    label="First & middle name"
                    required
                    autoComplete="given-name"
                    wrapperClassName="sm:col-span-3"
                    hint="As printed on your travel document"
                    {...register(`passengers.${index}.firstName`)}
                    error={rowErrors?.firstName?.message}
                  />
                  <Input
                    label="Last name"
                    required
                    autoComplete="family-name"
                    wrapperClassName="sm:col-span-2"
                    {...register(`passengers.${index}.lastName`)}
                    error={rowErrors?.lastName?.message}
                  />

                  <Input
                    label="Date of birth"
                    type="date"
                    required
                    wrapperClassName="sm:col-span-2"
                    {...register(`passengers.${index}.dateOfBirth`)}
                    error={rowErrors?.dateOfBirth?.message}
                  />
                  <Controller
                    control={control}
                    name={`passengers.${index}.gender`}
                    render={({ field: f }) => (
                      <Select
                        {...f}
                        label="Gender"
                        wrapperClassName="sm:col-span-2"
                        options={GENDER_OPTIONS}
                        error={rowErrors?.gender?.message}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name={`passengers.${index}.nationality`}
                    render={({ field: f }) => (
                      <Select
                        {...f}
                        label="Nationality"
                        wrapperClassName="sm:col-span-2"
                        options={countryOptions}
                        error={rowErrors?.nationality?.message}
                      />
                    )}
                  />

                  <Controller
                    control={control}
                    name={`passengers.${index}.documentType`}
                    render={({ field: f }) => (
                      <Select
                        {...f}
                        label="Document type"
                        wrapperClassName="sm:col-span-2"
                        options={DOCUMENT_OPTIONS}
                        error={rowErrors?.documentType?.message}
                      />
                    )}
                  />
                  <Input
                    label="Document number"
                    required
                    wrapperClassName="sm:col-span-2"
                    className="uppercase"
                    {...register(`passengers.${index}.documentNumber`)}
                    error={rowErrors?.documentNumber?.message}
                  />
                  <Input
                    label="Expiry date"
                    type="date"
                    required
                    wrapperClassName="sm:col-span-2"
                    {...register(`passengers.${index}.documentExpiry`)}
                    error={rowErrors?.documentExpiry?.message}
                  />

                  <Controller
                    control={control}
                    name={`passengers.${index}.frequentFlyerAirline`}
                    render={({ field: f }) => (
                      <Select
                        {...f}
                        label="Frequent flyer airline"
                        wrapperClassName="sm:col-span-3"
                        options={airlineOptions}
                        error={rowErrors?.frequentFlyerAirline?.message}
                      />
                    )}
                  />
                  <Input
                    label="Frequent flyer number"
                    wrapperClassName="sm:col-span-3"
                    hint="Optional — earn miles on this trip"
                    {...register(`passengers.${index}.frequentFlyerNumber`)}
                    error={rowErrors?.frequentFlyerNumber?.message}
                  />
                </div>
              </div>
            )}
          </section>
        );
      })}

      {/* ---- Contact ------------------------------------------------------- */}
      <section className="rounded-card border border-line bg-surface p-5 shadow-card">
        <h2 className="mb-1 text-base font-semibold text-ink">Contact details</h2>
        <p className="mb-4 text-sm text-muted">
          Where we send your tickets, and how the airline reaches you if the flight
          changes.
        </p>

        <div className="grid gap-4 sm:grid-cols-6">
          <Input
            label="Email"
            type="email"
            required
            autoComplete="email"
            wrapperClassName="sm:col-span-3"
            {...register("contact.email")}
            error={errors.contact?.email?.message}
          />
          <Controller
            control={control}
            name="contact.phoneCountryCode"
            render={({ field: f }) => (
              <Select
                {...f}
                label="Code"
                wrapperClassName="sm:col-span-1"
                options={DIAL_CODES}
                error={errors.contact?.phoneCountryCode?.message}
              />
            )}
          />
          <Input
            label="Mobile number"
            type="tel"
            required
            inputMode="numeric"
            autoComplete="tel-national"
            wrapperClassName="sm:col-span-2"
            {...register("contact.phone")}
            error={errors.contact?.phone?.message}
          />
          <Controller
            control={control}
            name="contact.country"
            render={({ field: f }) => (
              <Select
                {...f}
                label="Country of residence"
                wrapperClassName="sm:col-span-3"
                options={countryOptions}
                error={errors.contact?.country?.message}
              />
            )}
          />
        </div>
      </section>

      {/* ---- Emergency contact --------------------------------------------- */}
      <section className="rounded-card border border-line bg-surface p-5 shadow-card">
        <h2 className="mb-1 text-base font-semibold text-ink">
          Emergency contact{" "}
          <span className="font-normal text-muted">(optional)</span>
        </h2>
        <p className="mb-4 text-sm text-muted">
          Someone not travelling with you, in case of an in-flight emergency.
        </p>

        <div className="grid gap-4 sm:grid-cols-6">
          <Input
            label="Full name"
            wrapperClassName="sm:col-span-3"
            {...register("contact.emergencyName")}
            error={errors.contact?.emergencyName?.message}
          />
          <Input
            label="Relationship"
            wrapperClassName="sm:col-span-3"
            placeholder="e.g. Spouse, Parent"
            {...register("contact.emergencyRelationship")}
            error={errors.contact?.emergencyRelationship?.message}
          />
          <Controller
            control={control}
            name="contact.emergencyPhoneCountryCode"
            render={({ field: f }) => (
              <Select
                {...f}
                label="Code"
                wrapperClassName="sm:col-span-1"
                options={DIAL_CODES}
              />
            )}
          />
          <Input
            label="Phone number"
            type="tel"
            inputMode="numeric"
            wrapperClassName="sm:col-span-2"
            {...register("contact.emergencyPhone")}
            error={errors.contact?.emergencyPhone?.message}
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          rightIcon={<Plane className="size-4" aria-hidden="true" />}
        >
          Continue to seats
        </Button>
      </div>
    </form>
  );
}
