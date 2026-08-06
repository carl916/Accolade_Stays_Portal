"use client";

import { BedDouble, ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import {
  formatBedConfiguration,
  type BedConfiguration,
  type PhysicalBedType
} from "@/lib/domain/operations";
import { BedroomSetupForm, type BedroomFormBedroom } from "./BedroomSetupForm";

const bedTypeLabels = {
  zip_and_link: "Zip-and-link",
  fixed_double: "Fixed double",
  fixed_single: "Fixed single",
  other: "Other"
} satisfies Record<PhysicalBedType, string>;

type BedroomsSectionProps = {
  propertyId: string;
  bedrooms: BedroomFormBedroom[];
  errorMessage?: string;
};

function getConfigurationLabel(configuration: BedConfiguration) {
  return formatBedConfiguration(configuration);
}

export function BedroomsSection({ propertyId, bedrooms, errorMessage }: BedroomsSectionProps) {
  const [isCreating, setIsCreating] = useState(false);

  return (
    <section className="grid gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-brand-ink">Bedrooms</h2>
          <p className="mt-1 text-sm text-stone-600">Current setup and permitted choices for each bedroom.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreating((current) => !current)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-moss px-4 text-sm font-semibold text-white transition hover:bg-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-moss focus:ring-offset-2 sm:w-auto"
          aria-expanded={isCreating}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add bedroom
        </button>
      </div>

      {errorMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {isCreating ? (
        <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="mb-3 flex items-center gap-2">
            <BedDouble className="h-4 w-4 text-brand-moss" aria-hidden="true" />
            <h3 className="text-base font-semibold text-brand-ink">Add bedroom</h3>
          </div>
          <BedroomSetupForm propertyId={propertyId} onCancel={() => setIsCreating(false)} />
        </div>
      ) : null}

      {bedrooms.length === 0 ? (
        <p className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-600">
          No bedrooms have been added yet.
        </p>
      ) : null}

      <div className="grid gap-3">
        {bedrooms.map((bedroom) => (
          <details key={bedroom.id} className="group rounded-lg border border-stone-200 bg-white shadow-sm">
            <summary className="grid cursor-pointer list-none gap-3 px-3 py-3 outline-none focus:ring-2 focus:ring-brand-moss focus:ring-offset-2 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:px-4 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <BedDouble className="h-4 w-4 shrink-0 text-brand-moss" aria-hidden="true" />
                  <h3 className="truncate text-base font-semibold text-brand-ink">{bedroom.name}</h3>
                </div>
                <p className="mt-1 text-sm text-stone-600">{bedTypeLabels[bedroom.physical_bed_type]}</p>
              </div>
              <div className="rounded-md border border-brand-moss/20 bg-brand-moss/5 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-moss">Current</p>
                <p className="text-base font-semibold text-brand-ink">
                  {getConfigurationLabel(bedroom.current_configuration)}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    bedroom.is_active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {bedroom.is_active ? "Active" : "Inactive"}
                </span>
                <ChevronDown
                  className="h-4 w-4 text-stone-500 transition group-open:rotate-180"
                  aria-hidden="true"
                />
              </div>
            </summary>
            <div className="border-t border-stone-100 p-3 sm:p-4">
              <BedroomSetupForm propertyId={propertyId} bedroom={bedroom} />
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
