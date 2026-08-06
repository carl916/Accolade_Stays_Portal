"use client";

import { BedDouble, CalendarDays, MoreHorizontal, Plus, Settings } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { updateBedroom } from "@/lib/admin/property-actions";
import {
  bedroomSetupPhysicalBedTypes,
  formatBedConfiguration,
  zipAndLinkBedConfigurations,
  type BedConfiguration,
  type PhysicalBedType
} from "@/lib/domain/operations";
import { BedroomSetupForm, type BedroomFormBedroom } from "./BedroomSetupForm";
import { ModalSheet } from "./ModalSheet";

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

function getActivePermittedConfigurations(bedroom: BedroomFormBedroom) {
  if (bedroom.physical_bed_type === "zip_and_link") {
    return [...zipAndLinkBedConfigurations];
  }

  if (bedroom.physical_bed_type === "fixed_double") {
    return ["double"] satisfies BedConfiguration[];
  }

  return [];
}

function formatConfirmedAt(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function CurrentSetupButton({ configuration }: { configuration: BedConfiguration }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="currentConfiguration"
      value={configuration}
      disabled={pending}
      className="min-h-11 rounded-md border border-brand-slate bg-brand-chipSelected px-3 text-sm font-semibold text-brand-ink transition hover:bg-brand-light focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving..." : formatBedConfiguration(configuration)}
    </button>
  );
}

function CurrentSetupSelector({ propertyId, bedroom }: { propertyId: string; bedroom: BedroomFormBedroom }) {
  const permittedConfigurations = getActivePermittedConfigurations(bedroom);
  const canEditCurrentSetup = bedroomSetupPhysicalBedTypes.includes(
    bedroom.physical_bed_type as (typeof bedroomSetupPhysicalBedTypes)[number]
  );
  const canChangeQuickly = canEditCurrentSetup && permittedConfigurations.length > 1;

  if (!canChangeQuickly) {
    return (
      <span className="rounded-md bg-brand-chipSelected px-3 py-2 text-sm font-semibold text-brand-ink">
        {formatBedConfiguration(bedroom.current_configuration)}
      </span>
    );
  }

  return (
    <form action={updateBedroom} className="flex flex-wrap gap-2">
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="bedroomId" value={bedroom.id} />
      <input type="hidden" name="name" value={bedroom.name} />
      <input type="hidden" name="physicalBedType" value={bedroom.physical_bed_type} />
      {bedroom.is_active ? <input type="hidden" name="isActive" value="on" /> : null}
      {permittedConfigurations.map((configuration) => (
        <CurrentSetupButton key={configuration} configuration={configuration} />
      ))}
    </form>
  );
}

export function BedroomsSection({ propertyId, bedrooms, errorMessage }: BedroomsSectionProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [settingsBedroom, setSettingsBedroom] = useState<BedroomFormBedroom | null>(null);

  return (
    <>
      <section className="grid gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-brand-ink">Current bed setup</h2>
            <p className="mt-1 text-sm text-stone-600">Current operational configuration for each bedroom.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-primary px-4 text-sm font-semibold text-brand-primaryForeground transition hover:bg-brand-primaryHover focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2 sm:w-auto"
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

        {bedrooms.length === 0 ? (
          <p className="rounded-lg border border-brand-border bg-white p-4 text-sm text-stone-600">
            No bedrooms have been added yet.
          </p>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-brand-border bg-white shadow-sm">
          {bedrooms.map((bedroom, index) => (
            <div
              key={bedroom.id}
              className={`grid gap-3 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:p-4 ${
                index === 0 ? "" : "border-t border-brand-border"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <BedDouble className="h-4 w-4 shrink-0 text-brand-darkSlate" aria-hidden="true" />
                  <h3 className="truncate text-base font-semibold text-brand-ink">{bedroom.name}</h3>
                  {!bedroom.is_active ? (
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600">
                      Inactive
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-stone-600">{bedTypeLabels[bedroom.physical_bed_type]}</p>
                {bedroom.current_configuration_confirmed_at ? (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    Confirmed {formatConfirmedAt(bedroom.current_configuration_confirmed_at)}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-1">
                <p className="text-xs font-semibold uppercase tracking-normal text-brand-darkSlate">Current setup</p>
                <CurrentSetupSelector propertyId={propertyId} bedroom={bedroom} />
              </div>
              <button
                type="button"
                onClick={() => setSettingsBedroom(bedroom)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-brand-border px-3 text-sm font-semibold text-brand-ink transition hover:bg-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                Settings
              </button>
            </div>
          ))}
        </div>
      </section>

      <ModalSheet title="Add bedroom" isOpen={isCreating} onClose={() => setIsCreating(false)}>
        <BedroomSetupForm propertyId={propertyId} onCancel={() => setIsCreating(false)} />
      </ModalSheet>

      <ModalSheet
        title={settingsBedroom ? `Edit ${settingsBedroom.name}` : "Edit bedroom settings"}
        isOpen={Boolean(settingsBedroom)}
        onClose={() => setSettingsBedroom(null)}
      >
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-darkSlate">
          <Settings className="h-4 w-4" aria-hidden="true" />
          Bedroom administrative settings
        </div>
        {settingsBedroom ? (
          <BedroomSetupForm
            propertyId={propertyId}
            bedroom={settingsBedroom}
            onCancel={() => setSettingsBedroom(null)}
          />
        ) : null}
      </ModalSheet>
    </>
  );
}
