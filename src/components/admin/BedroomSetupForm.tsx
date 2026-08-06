"use client";

import { useMemo, useState } from "react";
import { createBedroom, updateBedroom } from "@/lib/admin/property-actions";
import {
  bedConfigurations,
  formatBedConfiguration,
  physicalBedTypes,
  type BedConfiguration,
  type PhysicalBedType
} from "@/lib/domain/operations";
import { FormSubmitButton } from "./FormSubmitButton";

const bedTypeLabels = {
  zip_and_link: "Zip-and-link",
  fixed_double: "Fixed double",
  fixed_single: "Fixed single",
  other: "Other"
} satisfies Record<PhysicalBedType, string>;

export type BedroomFormBedroom = {
  id: string;
  name: string;
  physical_bed_type: PhysicalBedType;
  default_configuration: BedConfiguration;
  current_configuration: BedConfiguration;
  current_configuration_confirmed_at: string | null;
  is_active: boolean;
  bedroom_permitted_configurations: {
    configuration: BedConfiguration;
    is_active: boolean;
  }[];
};

type BedroomSetupFormProps = {
  propertyId: string;
  bedroom?: BedroomFormBedroom;
  onCancel?: () => void;
};

function getInitialPermitted(bedroom?: BedroomFormBedroom) {
  const configurations =
    bedroom?.bedroom_permitted_configurations.filter((item) => item.is_active).map((item) => item.configuration) ?? [];

  const required = [bedroom?.default_configuration, bedroom?.current_configuration].filter(
    (configuration): configuration is BedConfiguration => Boolean(configuration)
  );
  const merged = [...new Set([...configurations, ...required])];

  return merged.length > 0 ? merged : (["unknown"] satisfies BedConfiguration[]);
}

function formatConfirmedAt(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function BedroomSetupForm({ propertyId, bedroom, onCancel }: BedroomSetupFormProps) {
  const initialPermitted = useMemo(() => getInitialPermitted(bedroom), [bedroom]);
  const initialDefault = bedroom?.default_configuration ?? "unknown";
  const initialCurrent = bedroom?.current_configuration ?? "unknown";
  const [permittedConfigurations, setPermittedConfigurations] = useState<BedConfiguration[]>(initialPermitted);
  const [defaultConfiguration, setDefaultConfiguration] = useState<BedConfiguration>(initialDefault);
  const [currentConfiguration, setCurrentConfiguration] = useState<BedConfiguration>(initialCurrent);
  const [message, setMessage] = useState<string | null>(null);
  const mode = bedroom ? "edit" : "create";
  const action = bedroom ? updateBedroom : createBedroom;

  function toggleConfiguration(configuration: BedConfiguration) {
    setMessage(null);
    setPermittedConfigurations((current) => {
      if (current.includes(configuration)) {
        if (current.length === 1) {
          setMessage("At least one permitted setup is required.");
          return current;
        }

        if (defaultConfiguration === configuration || currentConfiguration === configuration) {
          setMessage("Choose another default or current setup before removing this option.");
          return current;
        }

        return current.filter((item) => item !== configuration);
      }

      return [...current, configuration];
    });
  }

  function markCurrentUnknown() {
    setMessage(null);
    setPermittedConfigurations((current) => (current.includes("unknown") ? current : [...current, "unknown"]));
    setCurrentConfiguration("unknown");
  }

  function resetFormState() {
    setMessage(null);
    setPermittedConfigurations(initialPermitted);
    setDefaultConfiguration(initialDefault);
    setCurrentConfiguration(initialCurrent);
  }

  const permittedSet = new Set(permittedConfigurations);
  const confirmedAt = bedroom?.current_configuration_confirmed_at ?? null;

  return (
    <form action={action} onReset={resetFormState} className="grid gap-3">
      <input type="hidden" name="propertyId" value={propertyId} />
      {bedroom ? <input type="hidden" name="bedroomId" value={bedroom.id} /> : null}
      {permittedConfigurations.map((configuration) => (
        <input key={configuration} type="hidden" name="permittedConfigurations" value={configuration} />
      ))}

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
          Bedroom name
          <input
            name="name"
            required
            defaultValue={bedroom?.name ?? ""}
            className="min-h-11 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
          Physical bed type
          <select
            name="physicalBedType"
            defaultValue={bedroom?.physical_bed_type ?? "zip_and_link"}
            className="min-h-11 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
          >
            {physicalBedTypes.map((type) => (
              <option key={type} value={type}>
                {bedTypeLabels[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
          Default setup
          <select
            name="defaultConfiguration"
            value={defaultConfiguration}
            onChange={(event) => setDefaultConfiguration(event.target.value as BedConfiguration)}
            className="min-h-11 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
          >
            {permittedConfigurations.map((configuration) => (
              <option key={configuration} value={configuration}>
                {formatBedConfiguration(configuration)}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-medium text-brand-ink" htmlFor={`${mode}-${bedroom?.id ?? "new"}-current`}>
              Current setup
            </label>
            <button
              type="button"
              onClick={markCurrentUnknown}
              className="min-h-9 rounded-md border border-stone-300 px-3 text-xs font-semibold text-brand-moss transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-brand-moss focus:ring-offset-2"
            >
              Mark as unknown
            </button>
          </div>
          <select
            id={`${mode}-${bedroom?.id ?? "new"}-current`}
            name="currentConfiguration"
            value={currentConfiguration}
            onChange={(event) => setCurrentConfiguration(event.target.value as BedConfiguration)}
            className="min-h-11 rounded-md border border-brand-moss bg-brand-moss/5 px-3 text-base font-semibold text-brand-ink outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
          >
            {permittedConfigurations.map((configuration) => (
              <option key={configuration} value={configuration}>
                {formatBedConfiguration(configuration)}
              </option>
            ))}
          </select>
          {confirmedAt ? (
            <p className="text-xs text-stone-500">
              Last confirmed {formatConfirmedAt(confirmedAt)}
            </p>
          ) : null}
        </div>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium text-brand-ink">Permitted configurations</legend>
        <div className="flex flex-wrap gap-2">
          {bedConfigurations.map((configuration) => {
            const isSelected = permittedSet.has(configuration);

            return (
              <button
                key={configuration}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleConfiguration(configuration)}
                className={`min-h-11 rounded-md border px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-moss focus:ring-offset-2 ${
                  isSelected
                    ? "border-brand-moss bg-brand-moss text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                }`}
              >
                {formatBedConfiguration(configuration)}
              </button>
            );
          })}
        </div>
      </fieldset>

      {message ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          {message}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-stone-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
        {bedroom ? (
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-brand-ink">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={bedroom.is_active}
              className="h-5 w-5 rounded border-stone-300 text-brand-moss focus:ring-brand-moss"
            />
            Active bedroom
          </label>
        ) : (
          <span className="text-sm text-stone-500">New bedrooms are active when created.</span>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type={onCancel ? "button" : "reset"}
            onClick={onCancel}
            className="min-h-11 rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-brand-moss focus:ring-offset-2"
          >
            {onCancel ? "Cancel" : "Reset"}
          </button>
          <FormSubmitButton pendingLabel={bedroom ? "Saving..." : "Creating..."} className="sm:w-auto">
            {bedroom ? "Save bedroom" : "Create bedroom"}
          </FormSubmitButton>
        </div>
      </div>
    </form>
  );
}
