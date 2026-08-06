import { ArrowRight, BedDouble, CalendarPlus } from "lucide-react";
import Link from "next/link";
import { createCleaningJob } from "@/lib/admin/job-actions";
import { requireRole } from "@/lib/auth/session";
import {
  cleaningTypes,
  formatBedConfiguration,
  getBedConfigurationAction
} from "@/lib/domain/operations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type PropertyRow = Pick<
  Database["public"]["Tables"]["properties"]["Row"],
  "id" | "name" | "default_cleaning_duration_minutes"
>;
type BedroomRow = Pick<
  Database["public"]["Tables"]["bedrooms"]["Row"],
  "id" | "name" | "physical_bed_type" | "current_configuration"
> & {
  bedroom_permitted_configurations: Pick<
    Database["public"]["Tables"]["bedroom_permitted_configurations"]["Row"],
    "configuration" | "is_active"
  >[];
};

type NewJobPageProps = {
  searchParams?: Promise<{
    propertyId?: string;
    error?: string;
  }>;
};

const cleaningTypeLabels = {
  standard_changeover: "Standard changeover",
  mid_stay_clean: "Mid-stay clean",
  deep_or_remedial_clean: "Deep or remedial clean",
  other: "Other"
} satisfies Record<(typeof cleaningTypes)[number], string>;

export default async function NewCleaningJobPage({ searchParams }: NewJobPageProps) {
  await requireRole(["administrator"]);
  const resolvedSearchParams = await searchParams;
  const selectedPropertyId = resolvedSearchParams?.propertyId;
  const supabase = await createSupabaseServerClient();
  const { data: propertyData } = await supabase
    .from("properties")
    .select("id,name,default_cleaning_duration_minutes")
    .eq("is_active", true)
    .order("name");
  const properties = (propertyData ?? []) as PropertyRow[];
  const selectedProperty = properties.find((property) => property.id === selectedPropertyId) ?? properties[0] ?? null;

  const { data: bedroomData, error: bedroomError } = selectedProperty
    ? await supabase
        .from("bedrooms")
        .select("id,name,physical_bed_type,current_configuration,bedroom_permitted_configurations(configuration,is_active)")
        .eq("property_id", selectedProperty.id)
        .eq("is_active", true)
        .order("name")
    : { data: null, error: null };
  const bedrooms = (bedroomData ?? []) as BedroomRow[];

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <Link href="/admin/jobs" className="text-sm font-semibold text-brand-moss">
          Cleaning jobs
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-brand-ink">Create clean</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Select the property, timing, and required setup for every active bedroom.
        </p>
      </div>

      {resolvedSearchParams?.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {resolvedSearchParams.error}
        </p>
      ) : null}

      <form method="get" className="grid gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto]">
        <label className="grid gap-2 text-sm font-medium text-brand-ink">
          Property
          <select
            name="propertyId"
            defaultValue={selectedProperty?.id ?? ""}
            className="min-h-12 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
          >
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center gap-2 self-end rounded-md border border-stone-300 bg-white px-4 text-base font-semibold text-brand-ink transition hover:bg-brand-mint focus:outline-none focus:ring-2 focus:ring-brand-moss focus:ring-offset-2"
        >
          Load setup
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>

      {!selectedProperty ? (
        <p className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-600">
          Add an active property before creating a clean.
        </p>
      ) : null}

      {bedroomError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {bedroomError.message}
        </p>
      ) : null}

      {selectedProperty ? (
        <form action={createCleaningJob} className="grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <input type="hidden" name="propertyId" value={selectedProperty.id} />
          <div className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-brand-moss" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-brand-ink">{selectedProperty.name}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-brand-ink">
              Cleaning date
              <input
                name="scheduledDate"
                type="date"
                required
                className="min-h-12 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-brand-ink">
              Cleaning type
              <select
                name="cleaningType"
                defaultValue="standard_changeover"
                className="min-h-12 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
              >
                {cleaningTypes.map((type) => (
                  <option key={type} value={type}>
                    {cleaningTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-brand-ink">
              Expected start time
              <input
                name="expectedStartTime"
                type="time"
                className="min-h-12 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-brand-ink">
              Time window end
              <input
                name="expectedStartTimeWindowEnd"
                type="time"
                className="min-h-12 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-brand-ink">
              Guest arrival deadline
              <input
                name="guestArrivalDeadline"
                type="datetime-local"
                className="min-h-12 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-brand-ink">
              Expected duration minutes
              <input
                name="expectedDurationMinutes"
                type="number"
                min={1}
                required
                defaultValue={selectedProperty.default_cleaning_duration_minutes}
                className="min-h-12 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
              />
            </label>
          </div>

          <div className="grid gap-3">
            <div>
              <h3 className="text-base font-semibold text-brand-ink">Required bedroom setup</h3>
              <p className="mt-1 text-sm text-stone-600">
                These selections are snapshotted with the clean and will not change if the property template changes later.
              </p>
            </div>
            {bedrooms.length === 0 ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                Add at least one active bedroom before creating a clean for this property.
              </p>
            ) : null}
            {bedrooms.map((bedroom) => (
              <BedroomConfigurationCard key={bedroom.id} bedroom={bedroom} />
            ))}
          </div>

          <label className="grid gap-2 text-sm font-medium text-brand-ink">
            Instructions
            <textarea
              name="instructions"
              rows={4}
              className="rounded-md border border-stone-300 px-3 py-2 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-brand-ink">
            Internal notes
            <textarea
              name="notes"
              rows={3}
              className="rounded-md border border-stone-300 px-3 py-2 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
            />
          </label>
          <button
            type="submit"
            disabled={bedrooms.length === 0}
            className="min-h-12 rounded-md bg-brand-moss px-4 text-base font-semibold text-white transition hover:bg-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-moss focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
          >
            Create clean
          </button>
        </form>
      ) : null}
    </section>
  );
}

function BedroomConfigurationCard({ bedroom }: { bedroom: BedroomRow }) {
  const permittedConfigurations = bedroom.bedroom_permitted_configurations
    .filter((item) => item.is_active)
    .map((item) => item.configuration);
  const initialRequiredConfiguration = permittedConfigurations.includes(bedroom.current_configuration)
    ? bedroom.current_configuration
    : permittedConfigurations[0] ?? "unknown";

  return (
    <div className="grid gap-3 rounded-lg border border-stone-200 bg-brand-linen p-4">
      <div className="flex items-start gap-3">
        <BedDouble className="mt-1 h-5 w-5 text-brand-moss" aria-hidden="true" />
        <div>
          <h4 className="font-semibold text-brand-ink">{bedroom.name}</h4>
          <p className="mt-1 text-sm text-stone-600">
            Current: {formatBedConfiguration(bedroom.current_configuration)}
          </p>
        </div>
      </div>
      <label className="grid gap-2 text-sm font-medium text-brand-ink">
        Required setup
        <select
          name={`requiredConfiguration:${bedroom.id}`}
          defaultValue={initialRequiredConfiguration}
          className="min-h-12 rounded-md border border-stone-300 bg-white px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
        >
          {permittedConfigurations.map((configuration) => (
            <option key={configuration} value={configuration}>
              {formatBedConfiguration(configuration)}
            </option>
          ))}
        </select>
      </label>
      <p className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-brand-moss">
        Action:{" "}
        {getBedConfigurationAction({
          currentConfiguration: bedroom.current_configuration,
          requiredConfiguration: initialRequiredConfiguration
        })}
      </p>
    </div>
  );
}
