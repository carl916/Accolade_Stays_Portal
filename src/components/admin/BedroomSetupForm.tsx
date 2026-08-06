"use client";

import { useMemo, useState } from "react";
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

function getInitialBedType(bedroom?: BedroomFormBedroom): BedroomSetupPhysicalBedType {
  return bedroom?.physical_bed_type === "fixed_double" ? "fixed_double" : "zip_and_link";
}

function getInitialCurrentConfiguration(
  bedroom: BedroomFormBedroom | undefined,
  physicalBedType: BedroomSetupPhysicalBedType
) {
  if (physicalBedType === "fixed_double") {
    return "double";
  }

  return zipAndLinkBedConfigurations.includes(
    bedroom?.current_configuration as (typeof zipAndLinkBedConfigurations)[number]
  )
    ? bedroom?.current_configuration ?? ""
    : "";
}

export function BedroomSetupForm({ propertyId, bedroom, onCancel }: BedroomSetupFormProps) {
  const initialPhysicalBedType = useMemo(() => getInitialBedType(bedroom), [bedroom]);
  const initialCurrent = useMemo(
    () => getInitialCurrentConfiguration(bedroom, initialPhysicalBedType),
    [bedroom, initialPhysicalBedType]
  );
  const [name, setName] = useState(bedroom?.name ?? "");
  const [physicalBedType, setPhysicalBedType] = useState<BedroomSetupPhysicalBedType>(initialPhysicalBedType);
  const [currentConfiguration, setCurrentConfiguration] = useState<BedConfiguration | "">(initialCurrent);
  const mode = bedroom ? "edit" : "create";
  const action = bedroom ? updateBedroom : createBedroom;
  const isZipAndLink = physicalBedType === "zip_and_link";
  const isValid =
    name.trim().length > 0 &&
    bedroomSetupPhysicalBedTypes.includes(physicalBedType) &&
    (!isZipAndLink || zipAndLinkBedConfigurations.includes(currentConfiguration as (typeof zipAndLinkBedConfigurations)[number]));

  function handleBedTypeChange(value: BedroomSetupPhysicalBedType) {
    setPhysicalBedType(value);
    setCurrentConfiguration(value === "fixed_double" ? "double" : "");
  }

  function resetFormState() {
    setName(bedroom?.name ?? "");
    setPhysicalBedType(initialPhysicalBedType);
    setCurrentConfiguration(initialCurrent);
  }

  return (
    <form action={action} onReset={resetFormState} className="grid gap-3">
      <input type="hidden" name="propertyId" value={propertyId} />
      {bedroom ? <input type="hidden" name="bedroomId" value={bedroom.id} /> : null}
      {!isZipAndLink ? <input type="hidden" name="currentConfiguration" value="double" /> : null}

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
        <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
          Current setup
          <select
            id={`${mode}-${bedroom?.id ?? "new"}-current`}
            name="currentConfiguration"
            required
            value={currentConfiguration}
            onChange={(event) => setCurrentConfiguration(event.target.value as BedConfiguration)}
            className="min-h-11 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
          >
            <option value="" disabled>
              Select current setup
            </option>
            {zipAndLinkBedConfigurations.map((configuration) => (
              <option key={configuration} value={configuration}>
                {formatBedConfiguration(configuration)}
              </option>
            ))}
          </select>
        </label>
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
