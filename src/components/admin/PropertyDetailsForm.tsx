"use client";

import { Clock, MapPin, Pencil, StickyNote } from "lucide-react";
import { useState } from "react";
import type { Database } from "@/lib/supabase/types";
import { ModalSheet } from "./ModalSheet";
import { PropertyForm } from "./PropertyForm";

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];

type PropertyDetailsFormProps = {
  property: PropertyRow;
};

function formatPropertyAddress(property: PropertyRow) {
  const addressParts = [
    property.address_line_1,
    property.address_line_2,
    property.town,
    property.county,
    property.postcode
  ].filter(Boolean);

  return addressParts.length > 0 ? addressParts.join(", ") : "No address recorded";
}

export function PropertyDetailsForm({ property }: PropertyDetailsFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const address = formatPropertyAddress(property);

  return (
    <>
      <section className="rounded-lg border border-brand-border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold text-brand-ink">{property.name}</h2>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  property.is_active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600"
                }`}
              >
                {property.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-stone-700">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-darkSlate" aria-hidden="true" />
                <span>{address}</span>
              </p>
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-brand-darkSlate" aria-hidden="true" />
                <span>{property.default_cleaning_duration_minutes} minute default clean</span>
              </p>
              {property.notes ? (
                <p className="flex items-center gap-2 text-stone-600">
                  <StickyNote className="h-4 w-4 shrink-0 text-brand-slate" aria-hidden="true" />
                  Notes saved
                </p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-brand-slate bg-white px-3 text-sm font-semibold text-brand-ink transition hover:bg-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit property
          </button>
        </div>
      </section>

      <ModalSheet title="Edit property" isOpen={isEditing} onClose={() => setIsEditing(false)}>
        <PropertyForm property={property} onCancel={() => setIsEditing(false)} />
      </ModalSheet>
    </>
  );
}
