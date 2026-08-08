"use client";

import { Link2, Unlink } from "lucide-react";
import { disconnectSmoobuPropertyMapping, saveSmoobuPropertyMapping } from "@/lib/admin/smoobu-actions";
import { FormSubmitButton } from "./FormSubmitButton";

type SmoobuApartmentOption = {
  id: number;
  name: string;
};

type SmoobuMapping = {
  id: string;
  smoobu_apartment_id: number;
  smoobu_apartment_name: string;
  is_active: boolean;
  last_verified_at: string | null;
};

type SmoobuPropertyIntegrationProps = {
  propertyId: string;
  mapping: SmoobuMapping | null;
  apartments: SmoobuApartmentOption[];
  apartmentsError?: string;
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not checked yet";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getSelectedApartmentName(apartments: SmoobuApartmentOption[], apartmentId: number | null) {
  return apartments.find((apartment) => apartment.id === apartmentId)?.name ?? "";
}

export function SmoobuPropertyIntegration({
  propertyId,
  mapping,
  apartments,
  apartmentsError
}: SmoobuPropertyIntegrationProps) {
  const activeMapping = mapping?.is_active ? mapping : null;

  return (
    <section className="rounded-lg border border-brand-border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-brand-darkSlate" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-brand-ink">Smoobu</h2>
          </div>
          <div className="mt-2 grid gap-1 text-sm text-stone-600">
            {activeMapping ? (
              <>
                <p>
                  Connected to: <span className="font-semibold text-brand-ink">{activeMapping.smoobu_apartment_name}</span>
                </p>
                <p>Apartment ID: {activeMapping.smoobu_apartment_id}</p>
                <p>Last checked: {formatDateTime(activeMapping.last_verified_at)}</p>
              </>
            ) : (
              <p>No Smoobu apartment is connected to this property.</p>
            )}
            {apartmentsError ? <p className="font-medium text-amber-700">{apartmentsError}</p> : null}
          </div>
        </div>

        <div className="grid gap-2 lg:min-w-80">
          <form action={saveSmoobuPropertyMapping} className="grid gap-2">
            <input type="hidden" name="propertyId" value={propertyId} />
            <input
              type="hidden"
              name="smoobuApartmentName"
              value={
                getSelectedApartmentName(apartments, activeMapping?.smoobu_apartment_id ?? null) ||
                activeMapping?.smoobu_apartment_name ||
                ""
              }
            />
            <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
              Apartment
              <select
                name="smoobuApartmentId"
                defaultValue={activeMapping?.smoobu_apartment_id ?? ""}
                disabled={apartments.length === 0}
                onChange={(event) => {
                  const apartmentNameInput = event.currentTarget.form?.elements.namedItem(
                    "smoobuApartmentName"
                  ) as HTMLInputElement | null;
                  if (apartmentNameInput) {
                    apartmentNameInput.value =
                      event.currentTarget.selectedOptions[0]?.dataset.apartmentName ?? "";
                  }
                }}
                className="min-h-11 rounded-md border border-brand-border bg-white px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30 disabled:cursor-not-allowed disabled:bg-brand-muted"
              >
                <option value="" disabled>
                  Choose apartment
                </option>
                {apartments.map((apartment) => (
                  <option key={apartment.id} value={apartment.id} data-apartment-name={apartment.name}>
                    {apartment.name} ({apartment.id})
                  </option>
                ))}
              </select>
            </label>
            <FormSubmitButton disabled={apartments.length === 0} pendingLabel="Saving...">
              {activeMapping ? "Change" : "Connect"}
            </FormSubmitButton>
          </form>

          {activeMapping ? (
            <form action={disconnectSmoobuPropertyMapping}>
              <input type="hidden" name="propertyId" value={propertyId} />
              <button
                type="submit"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-brand-slate px-4 text-sm font-semibold text-brand-ink transition hover:bg-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2"
              >
                <Unlink className="h-4 w-4" aria-hidden="true" />
                Disconnect
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}
