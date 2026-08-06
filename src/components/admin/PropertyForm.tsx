"use client";

import { useState } from "react";
import { createProperty, updateProperty } from "@/lib/admin/property-actions";
import {
  formatCleaningDurationForPropertyDetail,
  formatCleaningDurationOption,
  isSupportedCleaningDuration,
  supportedCleaningDurations
} from "@/lib/domain/operations";
import type { Database } from "@/lib/supabase/types";
import { FormSubmitButton } from "./FormSubmitButton";

export type PropertyFormProperty = Pick<
  Database["public"]["Tables"]["properties"]["Row"],
  | "id"
  | "name"
  | "address_line_1"
  | "address_line_2"
  | "town"
  | "county"
  | "postcode"
  | "default_cleaning_duration_minutes"
  | "notes"
  | "is_active"
>;

type PropertyFormProps = {
  property?: PropertyFormProperty;
  onCancel: () => void;
};

export function PropertyForm({ property, onCancel }: PropertyFormProps) {
  const [isDirty, setIsDirty] = useState(false);
  const isEditing = Boolean(property);
  const durationValue = property?.default_cleaning_duration_minutes ?? 180;
  const hasSupportedDuration = isSupportedCleaningDuration(durationValue);

  return (
    <form
      action={isEditing ? updateProperty : createProperty}
      onChange={() => setIsDirty(true)}
      className="grid gap-3"
    >
      {property ? <input type="hidden" name="propertyId" value={property.id} /> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-brand-ink" htmlFor="property-name">
          Name
          <input
            id="property-name"
            name="name"
            required
            defaultValue={property?.name ?? ""}
            className="min-h-11 rounded-md border border-brand-border px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-brand-ink" htmlFor="property-duration">
          Default cleaning duration
          <select
            id="property-duration"
            name="defaultCleaningDurationMinutes"
            required
            defaultValue={hasSupportedDuration ? String(durationValue) : ""}
            className="min-h-11 rounded-md border border-brand-border px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
          >
            <option value="" disabled>
              Select cleaning duration
            </option>
            {supportedCleaningDurations.map((duration) => (
              <option key={duration} value={duration}>
                {formatCleaningDurationOption(duration)}
              </option>
            ))}
          </select>
          {!hasSupportedDuration ? (
            <span className="text-xs font-normal text-amber-700">
              Current value: {formatCleaningDurationForPropertyDetail(durationValue)}. Choose a supported duration before saving.
            </span>
          ) : null}
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-brand-ink" htmlFor="property-address-1">
          Address Line 1
          <input
            id="property-address-1"
            name="addressLine1"
            defaultValue={property?.address_line_1 ?? ""}
            className="min-h-11 rounded-md border border-brand-border px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-brand-ink" htmlFor="property-address-2">
          Address Line 2
          <input
            id="property-address-2"
            name="addressLine2"
            defaultValue={property?.address_line_2 ?? ""}
            className="min-h-11 rounded-md border border-brand-border px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-brand-ink" htmlFor="property-town">
          Town
          <input
            id="property-town"
            name="town"
            defaultValue={property?.town ?? ""}
            className="min-h-11 rounded-md border border-brand-border px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-brand-ink" htmlFor="property-county">
          County
          <input
            id="property-county"
            name="county"
            defaultValue={property?.county ?? ""}
            className="min-h-11 rounded-md border border-brand-border px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-brand-ink" htmlFor="property-postcode">
          Postcode
          <input
            id="property-postcode"
            name="postcode"
            defaultValue={property?.postcode ?? ""}
            className="min-h-11 rounded-md border border-brand-border px-3 text-base uppercase outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-brand-ink" htmlFor="property-notes">
          Notes
          <textarea
            id="property-notes"
            name="notes"
            rows={2}
            defaultValue={property?.notes ?? ""}
            className="rounded-md border border-brand-border px-3 py-2 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
          />
        </label>
      </div>

      {property ? (
        <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-brand-ink">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={property.is_active}
            className="h-5 w-5 rounded border-brand-border text-brand-primary focus:ring-brand-focus"
          />
          Active property
        </label>
      ) : null}

      <div className="flex flex-col gap-2 border-t border-brand-border pt-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-md border border-brand-slate px-4 text-sm font-semibold text-brand-ink transition hover:bg-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2"
        >
          Cancel
        </button>
        <FormSubmitButton pendingLabel={isEditing ? "Saving..." : "Creating..."} className="sm:w-auto">
          {isEditing ? "Save changes" : "Create property"}
        </FormSubmitButton>
      </div>
      {isDirty ? <p className="text-sm font-medium text-amber-700">Unsaved changes</p> : null}
    </form>
  );
}
