"use client";

import { BedDouble, CalendarDays, Loader2, Pencil, Plus } from "lucide-react";
import React from "react";
import { useEffect, useState, useTransition, type KeyboardEvent } from "react";
import { updateBedroomCurrentSetup } from "@/lib/admin/property-actions";
import {
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

function CurrentSetupSelector({ propertyId, bedroom }: { propertyId: string; bedroom: BedroomFormBedroom }) {
  const permittedConfigurations = getActivePermittedConfigurations(bedroom);
  const [selectedConfiguration, setSelectedConfiguration] = useState<BedConfiguration>(bedroom.current_configuration);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canChangeQuickly = bedroom.physical_bed_type === "zip_and_link" && permittedConfigurations.length > 1;

  useEffect(() => {
    setSelectedConfiguration(bedroom.current_configuration);
  }, [bedroom.current_configuration]);

  if (!canChangeQuickly) {
    return (
      <div className="grid gap-1">
        <span className="inline-flex min-h-10 w-fit items-center rounded-md border border-brand-border bg-brand-muted px-3 text-sm font-semibold text-brand-ink">
          {formatBedConfiguration(bedroom.current_configuration)}
        </span>
      </div>
    );
  }

  function chooseConfiguration(configuration: BedConfiguration) {
    if (configuration === selectedConfiguration || isPending) {
      return;
    }

    const previousConfiguration = selectedConfiguration;
    setSelectedConfiguration(configuration);
    setErrorMessage(null);

    startTransition(async () => {
      const result = await updateBedroomCurrentSetup({
        propertyId,
        bedroomId: bedroom.id,
        currentConfiguration: configuration
      });

      if (result.error) {
        setSelectedConfiguration(previousConfiguration);
        setErrorMessage(result.error);
      }
    });
  }

  function handleConfigurationKeyDown(event: KeyboardEvent<HTMLButtonElement>, configuration: BedConfiguration) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const currentIndex = zipAndLinkBedConfigurations.indexOf(
      configuration as (typeof zipAndLinkBedConfigurations)[number]
    );
    const nextIndex =
      event.key === "ArrowRight"
        ? (currentIndex + 1) % zipAndLinkBedConfigurations.length
        : (currentIndex - 1 + zipAndLinkBedConfigurations.length) % zipAndLinkBedConfigurations.length;
    chooseConfiguration(zipAndLinkBedConfigurations[nextIndex]);
  }

  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-2">
        <div
          role="radiogroup"
          aria-label={`${bedroom.name} current setup`}
          className="inline-grid min-h-10 grid-cols-2 overflow-hidden rounded-md border border-brand-border bg-white"
        >
          {zipAndLinkBedConfigurations.map((configuration) => {
            const isSelected = selectedConfiguration === configuration;

            return (
              <button
                key={configuration}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={isPending}
                onClick={() => chooseConfiguration(configuration)}
                onKeyDown={(event) => handleConfigurationKeyDown(event, configuration)}
                className={`min-h-10 min-w-20 px-3 text-sm font-semibold transition focus:outline-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-brand-focus disabled:cursor-wait ${
                  isSelected
                    ? "bg-brand-primary text-brand-primaryForeground shadow-inner"
                    : "bg-white text-stone-700 hover:bg-brand-muted hover:text-brand-primary"
                }`}
              >
                {formatBedConfiguration(configuration)}
              </button>
            );
          })}
        </div>
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-brand-primary" aria-label="Saving current setup" />
        ) : null}
      </div>
      {errorMessage ? <p className="text-xs font-medium text-red-700">{errorMessage}</p> : null}
    </div>
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
          {bedrooms.length > 0 ? (
            <div className="hidden grid-cols-[minmax(0,1fr)_12rem_3rem] items-end gap-4 border-b border-brand-border bg-brand-muted px-4 py-2 sm:grid">
              <span aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-normal text-brand-darkSlate">Current setup</p>
              <span aria-hidden="true" />
            </div>
          ) : null}
          {bedrooms.map((bedroom, index) => (
            <div
              key={bedroom.id}
              className={`grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_12rem_3rem] sm:items-center sm:gap-4 sm:p-4 ${
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
              <div className="flex flex-wrap items-start justify-between gap-3 sm:contents">
                <div className="grid gap-1 sm:justify-start">
                  <p className="text-xs font-semibold uppercase tracking-normal text-brand-darkSlate sm:hidden">
                    Current setup
                  </p>
                  <CurrentSetupSelector propertyId={propertyId} bedroom={bedroom} />
                </div>
                <button
                  type="button"
                  aria-label={`Edit bedroom: ${bedroom.name}`}
                  title="Edit bedroom"
                  onClick={() => setSettingsBedroom(bedroom)}
                  className="inline-flex min-h-10 min-w-10 w-fit items-center justify-center rounded-md border border-brand-border text-brand-ink transition hover:bg-brand-muted hover:text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2 sm:justify-self-end"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Edit bedroom</span>
                </button>
              </div>
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
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Bedroom details
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
