"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { createBedroom, updateBedroom } from "@/lib/admin/property-actions";
import {
  bedroomSetupPhysicalBedTypes,
  formatBedConfiguration,
  zipAndLinkBedConfigurations,
  type BedConfiguration,
  type BedroomSetupPhysicalBedType,
  type PhysicalBedType
} from "@/lib/domain/operations";
import { FormSubmitButton } from "./FormSubmitButton";

const bedTypeLabels = {
  zip_and_link: "Zip-and-link",
  fixed_double: "Fixed double"
} satisfies Record<BedroomSetupPhysicalBedType, string>;

const fixedDoubleConfigurations = ["double"] satisfies BedConfiguration[];

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
  if (bedroom?.physical_bed_type === "fixed_double") {
    return fixedDoubleConfigurations;
  }

  const configurations =
    bedroom?.bedroom_permitted_configurations.filter((item) => item.is_active).map((item) => item.configuration) ?? [];

  const required = [bedroom?.default_configuration, bedroom?.current_configuration].filter(
    (configuration): configuration is BedConfiguration => Boolean(configuration)
  );
  const selectableConfigurations = new Set<BedConfiguration>(zipAndLinkBedConfigurations);
  const merged = [...new Set([...configurations, ...required])].filter((configuration) =>
    selectableConfigurations.has(configuration)
  );

  return merged.length > 0 ? merged : (["king"] satisfies BedConfiguration[]);
}

function getInitialBedType(bedroom?: BedroomFormBedroom): BedroomSetupPhysicalBedType {
  return bedroom?.physical_bed_type === "fixed_double" ? "fixed_double" : "zip_and_link";
}

function getInitialConfiguration(
  configuration: BedConfiguration | undefined,
  permittedConfigurations: BedConfiguration[],
  fallback: BedConfiguration
) {
  return configuration && permittedConfigurations.includes(configuration) ? configuration : fallback;
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
  const initialPhysicalBedType = useMemo(() => getInitialBedType(bedroom), [bedroom]);
  const initialDefault = getInitialConfiguration(bedroom?.default_configuration, initialPermitted, initialPermitted[0]);
  const initialCurrent = getInitialConfiguration(bedroom?.current_configuration, initialPermitted, initialDefault);
  const [name, setName] = useState(bedroom?.name ?? "");
  const [physicalBedType, setPhysicalBedType] = useState<BedroomSetupPhysicalBedType>(initialPhysicalBedType);
  const [permittedConfigurations, setPermittedConfigurations] = useState<BedConfiguration[]>(initialPermitted);
  const [defaultConfiguration, setDefaultConfiguration] = useState<BedConfiguration>(initialDefault);
  const [currentConfiguration, setCurrentConfiguration] = useState<BedConfiguration>(initialCurrent);
  const [message, setMessage] = useState<string | null>(null);
  const mode = bedroom ? "edit" : "create";
  const action = bedroom ? updateBedroom : createBedroom;

  function setFixedDoubleState() {
    setPermittedConfigurations(fixedDoubleConfigurations);
    setDefaultConfiguration("double");
    setCurrentConfiguration("double");
  }

  function handleBedTypeChange(value: BedroomSetupPhysicalBedType) {
    setMessage(null);
    setPhysicalBedType(value);

    if (value === "fixed_double") {
      setFixedDoubleState();
      return;
    }

    const nextPermitted = permittedConfigurations.filter((configuration) =>
      zipAndLinkBedConfigurations.includes(configuration as (typeof zipAndLinkBedConfigurations)[number])
    );
    const fallbackPermitted = nextPermitted.length > 0 ? nextPermitted : (["king"] satisfies BedConfiguration[]);
    const fallbackDefault = fallbackPermitted.includes(defaultConfiguration) ? defaultConfiguration : fallbackPermitted[0];
    const fallbackCurrent = fallbackPermitted.includes(currentConfiguration) ? currentConfiguration : fallbackDefault;
    setPermittedConfigurations(fallbackPermitted);
    setDefaultConfiguration(fallbackDefault);
    setCurrentConfiguration(fallbackCurrent);
  }

  function toggleConfiguration(configuration: BedConfiguration) {
    setMessage(null);
    setPermittedConfigurations((current) => {
      if (current.includes(configuration)) {
        if (current.length === 1) {
          setMessage("At least one permitted setup is required.");
          return current;
        }

        const next = current.filter((item) => item !== configuration);
        const nextDefault = defaultConfiguration === configuration ? next[0] : defaultConfiguration;
        const nextCurrent = currentConfiguration === configuration ? nextDefault : currentConfiguration;
        setDefaultConfiguration(nextDefault);
        setCurrentConfiguration(nextCurrent);
        return next;
      }

      return [...current, configuration];
    });
  }

  function handleDefaultConfigurationChange(configuration: BedConfiguration) {
    setDefaultConfiguration(configuration);
    setCurrentConfiguration(configuration);
  }

  function resetFormState() {
    setMessage(null);
    setName(bedroom?.name ?? "");
    setPhysicalBedType(initialPhysicalBedType);
    setPermittedConfigurations(initialPermitted);
    setDefaultConfiguration(initialDefault);
    setCurrentConfiguration(initialCurrent);
  }

  const permittedSet = new Set(permittedConfigurations);
  const confirmedAt = bedroom?.current_configuration_confirmed_at ?? null;
  const isZipAndLink = physicalBedType === "zip_and_link";
  const isValid =
    name.trim().length > 0 &&
    bedroomSetupPhysicalBedTypes.includes(physicalBedType) &&
    permittedConfigurations.length > 0 &&
    permittedConfigurations.includes(defaultConfiguration) &&
    permittedConfigurations.includes(currentConfiguration);

  return (
    <form action={action} onReset={resetFormState} className="grid gap-3">
      <input type="hidden" name="propertyId" value={propertyId} />
      {bedroom ? <input type="hidden" name="bedroomId" value={bedroom.id} /> : null}
      {permittedConfigurations.map((configuration) => (
        <input key={configuration} type="hidden" name="permittedConfigurations" value={configuration} />
      ))}

      <div className="grid gap-3">
        <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
          Bedroom name
          <input
            name="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="min-h-11 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
          Bed type
          <select
            name="physicalBedType"
            value={physicalBedType}
            onChange={(event) => handleBedTypeChange(event.target.value as BedroomSetupPhysicalBedType)}
            className="min-h-11 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
          >
            {bedroomSetupPhysicalBedTypes.map((type) => (
              <option key={type} value={type}>
                {bedTypeLabels[type]}
              </option>
            ))}
          </select>
        </label>

        {isZipAndLink ? (
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-brand-ink">Permitted configurations</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {zipAndLinkBedConfigurations.map((configuration) => {
                const isSelected = permittedSet.has(configuration);

                return (
                  <button
                    key={configuration}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleConfiguration(configuration)}
                    className={`flex min-h-11 items-center justify-between rounded-md border px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2 ${
                      isSelected
                        ? "border-brand-slate bg-brand-chipSelected text-brand-ink"
                        : "border-brand-border bg-white text-stone-700 hover:bg-brand-muted"
                    }`}
                  >
                    <span>{formatBedConfiguration(configuration)}</span>
                    {isSelected ? <Check aria-hidden="true" className="h-5 w-5 text-brand-moss" /> : null}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          {isZipAndLink ? (
            <>
              <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
                Default setup
                <select
                  name="defaultConfiguration"
                  value={defaultConfiguration}
                  onChange={(event) => handleDefaultConfigurationChange(event.target.value as BedConfiguration)}
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
                <label className="text-sm font-medium text-brand-ink" htmlFor={`${mode}-${bedroom?.id ?? "new"}-current`}>
                  Current setup
                </label>
                <select
                  id={`${mode}-${bedroom?.id ?? "new"}-current`}
                  name="currentConfiguration"
                  value={currentConfiguration}
                  onChange={(event) => setCurrentConfiguration(event.target.value as BedConfiguration)}
                  className="min-h-11 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
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
            </>
          ) : (
            <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-700 md:col-span-2">
              Fixed double bedrooms use Double for permitted, default and current setup.
            </div>
          )}
        </div>
      </div>

      {!isZipAndLink ? (
        <>
          <input type="hidden" name="defaultConfiguration" value="double" />
          <input type="hidden" name="currentConfiguration" value="double" />
        </>
      ) : null}

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
          <FormSubmitButton disabled={!isValid} pendingLabel={bedroom ? "Saving..." : "Creating..."} className="sm:w-auto">
            {bedroom ? "Save bedroom" : "Create bedroom"}
          </FormSubmitButton>
        </div>
      </div>
    </form>
  );
}
