"use client";

import { Save } from "lucide-react";
import { useState } from "react";
import { updateProperty } from "@/lib/admin/property-actions";
import type { Database } from "@/lib/supabase/types";
import { FormSubmitButton } from "./FormSubmitButton";

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];

type PropertyDetailsFormProps = {
  property: PropertyRow;
};

function hasPropertyMoreDetails(property: PropertyRow) {
  return Boolean(
    property.address_line_1 ||
      property.address_line_2 ||
      property.town ||
      property.county ||
      property.postcode ||
      property.notes
  );
}

export function PropertyDetailsForm({ property }: PropertyDetailsFormProps) {
  const [isDirty, setIsDirty] = useState(false);

  return (
    <form
      action={updateProperty}
      onChange={() => setIsDirty(true)}
      onReset={() => setIsDirty(false)}
      className="grid gap-3 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:p-4"
    >
      <input type="hidden" name="propertyId" value={property.id} />
      <div className="flex items-center gap-2">
        <Save className="h-4 w-4 text-brand-moss" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-brand-ink">Property details</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-brand-ink" htmlFor="name">
          Name
          <input
            id="name"
            name="name"
            required
            defaultValue={property.name}
            className="min-h-11 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-brand-ink" htmlFor="defaultCleaningDurationMinutes">
          Default duration minutes
          <input
            id="defaultCleaningDurationMinutes"
            name="defaultCleaningDurationMinutes"
            type="number"
            min={1}
            required
            defaultValue={property.default_cleaning_duration_minutes}
            className="min-h-11 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
          />
        </label>
      </div>

      <details open={hasPropertyMoreDetails(property)} className="rounded-md border border-stone-200 bg-stone-50/40">
        <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-brand-moss outline-none focus:ring-2 focus:ring-brand-moss focus:ring-offset-2">
          More details
        </summary>
        <div className="grid gap-3 border-t border-stone-200 p-3 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium text-brand-ink" htmlFor="addressLine1">
            Address Line 1
            <input
              id="addressLine1"
              name="addressLine1"
              defaultValue={property.address_line_1}
              className="min-h-11 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-brand-ink" htmlFor="addressLine2">
            Address Line 2
            <input
              id="addressLine2"
              name="addressLine2"
              defaultValue={property.address_line_2}
              className="min-h-11 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-brand-ink" htmlFor="town">
            Town
            <input
              id="town"
              name="town"
              defaultValue={property.town}
              className="min-h-11 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-brand-ink" htmlFor="county">
            County
            <input
              id="county"
              name="county"
              defaultValue={property.county}
              className="min-h-11 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-brand-ink" htmlFor="postcode">
            Postcode
            <input
              id="postcode"
              name="postcode"
              defaultValue={property.postcode}
              className="min-h-11 rounded-md border border-stone-300 px-3 text-base uppercase outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-brand-ink md:col-span-2" htmlFor="notes">
            Notes
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={property.notes}
              className="rounded-md border border-stone-300 px-3 py-2 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
            />
          </label>
        </div>
      </details>

      <div className="flex flex-col gap-3 border-t border-stone-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-brand-ink">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={property.is_active}
            className="h-5 w-5 rounded border-stone-300 text-brand-moss focus:ring-brand-moss"
          />
          Active property
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <span className={`text-sm font-medium ${isDirty ? "text-amber-700" : "text-stone-500"}`}>
            {isDirty ? "Unsaved changes" : "Saved"}
          </span>
          {isDirty ? (
            <button
              type="reset"
              className="min-h-11 rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-brand-moss focus:ring-offset-2"
            >
              Reset
            </button>
          ) : null}
          <FormSubmitButton pendingLabel="Saving..." className="sm:w-auto">
            Save changes
          </FormSubmitButton>
        </div>
      </div>
    </form>
  );
}
