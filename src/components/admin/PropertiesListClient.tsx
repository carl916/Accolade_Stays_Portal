"use client";

import { BedDouble, ChevronRight, Clock, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  formatBedConfiguration,
  formatCleaningDurationForPropertyCard,
  type BedConfiguration,
  type PhysicalBedType
} from "@/lib/domain/operations";
import { ModalSheet } from "./ModalSheet";
import { PropertyForm, type PropertyFormProperty } from "./PropertyForm";

type PropertyBedroom = {
  id: string;
  name: string;
  current_configuration: BedConfiguration;
  physical_bed_type: PhysicalBedType;
  is_active: boolean;
};

export type PropertyCardProperty = PropertyFormProperty & {
  bedrooms: PropertyBedroom[];
};

type PropertiesListClientProps = {
  properties: PropertyCardProperty[];
  errorMessage?: string;
  searchError?: string;
};

function formatPropertyAddress(property: PropertyFormProperty) {
  const addressParts = [
    property.address_line_1,
    property.address_line_2,
    property.town,
    property.county,
    property.postcode
  ].filter(Boolean);

  return addressParts.length > 0 ? addressParts.join(", ") : "No address recorded";
}

export function PropertiesListClient({ properties, errorMessage, searchError }: PropertiesListClientProps) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <>
      <section className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-brand-darkSlate">Administrator</p>
            <h1 className="mt-1 text-3xl font-semibold text-brand-ink">Properties</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">
              Property records, bedroom setup and default cleaning time.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-primary px-4 text-sm font-semibold text-brand-primaryForeground transition hover:bg-brand-primaryHover focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add property
            </button>
          </div>
        </div>

        {searchError ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {searchError}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => {
            const activeBedrooms = property.bedrooms.filter((bedroom) => bedroom.is_active);

            return (
              <Link
                key={property.id}
                href={`/admin/properties/${property.id}`}
                className="group grid gap-3 rounded-lg border border-brand-border bg-white p-4 shadow-sm transition hover:border-brand-slate hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-brand-ink">{property.name}</h2>
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-stone-600">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-slate" aria-hidden="true" />
                      <span className="line-clamp-2">{formatPropertyAddress(property)}</span>
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      property.is_active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {property.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm text-stone-700">
                  <span className="inline-flex items-center gap-1.5">
                    <BedDouble className="h-4 w-4 text-brand-darkSlate" aria-hidden="true" />
                    {activeBedrooms.length} {activeBedrooms.length === 1 ? "bedroom" : "bedrooms"}
                  </span>
                  <span aria-hidden="true">.</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-brand-darkSlate" aria-hidden="true" />
                    {formatCleaningDurationForPropertyCard(property.default_cleaning_duration_minutes)}
                  </span>
                </div>

                {activeBedrooms.length > 0 ? (
                  <div className="grid gap-1.5 border-t border-brand-border pt-3">
                    {activeBedrooms.map((bedroom) => (
                      <div key={bedroom.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate text-stone-700">{bedroom.name}</span>
                        <span className="shrink-0 rounded-md bg-brand-chipSelected px-2 py-1 font-semibold text-brand-ink">
                          {formatBedConfiguration(bedroom.current_configuration)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="border-t border-brand-border pt-3 text-sm text-stone-500">No active bedrooms</p>
                )}

                <span className="inline-flex items-center justify-end gap-1 text-sm font-semibold text-brand-darkSlate">
                  View property
                  <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <ModalSheet title="Add property" isOpen={isAdding} onClose={() => setIsAdding(false)}>
        <PropertyForm onCancel={() => setIsAdding(false)} />
      </ModalSheet>
    </>
  );
}
