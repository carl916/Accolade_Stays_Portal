import { ArrowLeft, BedDouble, Save } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createBedroom, updateBedroom, updateProperty } from "@/lib/admin/property-actions";
import { requireRole } from "@/lib/auth/session";
import { bedConfigurations, physicalBedTypes } from "@/lib/domain/operations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];
type BedroomRow = Database["public"]["Tables"]["bedrooms"]["Row"] & {
  bedroom_permitted_configurations: Database["public"]["Tables"]["bedroom_permitted_configurations"]["Row"][];
};

type PropertyDetailPageProps = {
  params: Promise<{
    propertyId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

const configurationLabels = {
  king: "King",
  double: "Double",
  two_singles: "Two singles",
  single: "Single",
  unmade: "Unmade",
  other: "Other",
  unknown: "Unknown"
} satisfies Record<(typeof bedConfigurations)[number], string>;

const bedTypeLabels = {
  zip_and_link: "Zip-and-link",
  fixed_double: "Fixed double",
  fixed_single: "Fixed single",
  other: "Other"
} satisfies Record<(typeof physicalBedTypes)[number], string>;

export default async function PropertyDetailPage({ params, searchParams }: PropertyDetailPageProps) {
  await requireRole(["administrator"]);
  const { propertyId } = await params;
  const resolvedSearchParams = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: propertyData } = await supabase.from("properties").select("*").eq("id", propertyId).maybeSingle();
  const property = propertyData as PropertyRow | null;

  if (!property) {
    notFound();
  }

  const { data: bedroomData, error: bedroomError } = await supabase
    .from("bedrooms")
    .select("*,bedroom_permitted_configurations(*)")
    .eq("property_id", property.id)
    .order("name");
  const bedrooms = (bedroomData ?? []) as BedroomRow[];

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin/properties" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-moss">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Properties
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-brand-ink">{property.name}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            Maintain property details and bedroom templates used when creating cleaning jobs.
          </p>
        </div>
      </div>

      {resolvedSearchParams?.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {resolvedSearchParams.error}
        </p>
      ) : null}

      <form action={updateProperty} className="grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <input type="hidden" name="propertyId" value={property.id} />
        <div className="flex items-center gap-2">
          <Save className="h-5 w-5 text-brand-moss" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-brand-ink">Property details</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-brand-ink" htmlFor="name">
            Name
            <input
              id="name"
              name="name"
              required
              defaultValue={property.name}
              className="min-h-12 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-brand-ink" htmlFor="defaultCleaningDurationMinutes">
            Default duration minutes
            <input
              id="defaultCleaningDurationMinutes"
              name="defaultCleaningDurationMinutes"
              type="number"
              min={1}
              required
              defaultValue={property.default_cleaning_duration_minutes}
              className="min-h-12 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
            />
          </label>
        </div>
        <label className="grid gap-2 text-sm font-medium text-brand-ink" htmlFor="address">
          Address
          <textarea
            id="address"
            name="address"
            rows={3}
            defaultValue={property.address ?? ""}
            className="rounded-md border border-stone-300 px-3 py-2 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-brand-ink" htmlFor="notes">
          Notes
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={property.notes}
            className="rounded-md border border-stone-300 px-3 py-2 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
          />
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-brand-ink">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={property.is_active}
            className="h-5 w-5 rounded border-stone-300 text-brand-moss focus:ring-brand-moss"
          />
          Active property
        </label>
        <button
          type="submit"
          className="min-h-12 rounded-md bg-brand-moss px-4 text-base font-semibold text-white transition hover:bg-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-moss focus:ring-offset-2 sm:w-fit"
        >
          Save property
        </button>
      </form>

      <div className="grid gap-4 lg:grid-cols-[1fr_24rem]">
        <div className="grid gap-4">
          <div>
            <h2 className="text-xl font-semibold text-brand-ink">Bedrooms</h2>
            <p className="mt-1 text-sm text-stone-600">Each bedroom keeps a current setup and permitted setup choices.</p>
          </div>
          {bedroomError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {bedroomError.message}
            </p>
          ) : null}
          {bedrooms.length === 0 ? (
            <p className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-600">
              No bedrooms have been added yet.
            </p>
          ) : null}
          {bedrooms.map((bedroom) => (
            <BedroomForm key={bedroom.id} propertyId={property.id} bedroom={bedroom} />
          ))}
        </div>
        <BedroomForm propertyId={property.id} />
      </div>
    </section>
  );
}

function BedroomForm({ propertyId, bedroom }: { propertyId: string; bedroom?: BedroomRow }) {
  const permitted = new Set(
    bedroom?.bedroom_permitted_configurations.filter((item) => item.is_active).map((item) => item.configuration) ?? [
      "unknown"
    ]
  );

  return (
    <form
      action={bedroom ? updateBedroom : createBedroom}
      className="grid h-fit gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="propertyId" value={propertyId} />
      {bedroom ? <input type="hidden" name="bedroomId" value={bedroom.id} /> : null}
      <div className="flex items-center gap-2">
        <BedDouble className="h-5 w-5 text-brand-moss" aria-hidden="true" />
        <h3 className="text-lg font-semibold text-brand-ink">{bedroom ? bedroom.name : "Add bedroom"}</h3>
      </div>
      <label className="grid gap-2 text-sm font-medium text-brand-ink">
        Bedroom name
        <input
          name="name"
          required
          defaultValue={bedroom?.name ?? ""}
          className="min-h-12 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-brand-ink">
        Physical bed type
        <select
          name="physicalBedType"
          defaultValue={bedroom?.physical_bed_type ?? "zip_and_link"}
          className="min-h-12 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
        >
          {physicalBedTypes.map((type) => (
            <option key={type} value={type}>
              {bedTypeLabels[type]}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-brand-ink">
          Default setup
          <ConfigurationSelect name="defaultConfiguration" defaultValue={bedroom?.default_configuration ?? "unknown"} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-brand-ink">
          Current setup
          <ConfigurationSelect name="currentConfiguration" defaultValue={bedroom?.current_configuration ?? "unknown"} />
        </label>
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium text-brand-ink">Permitted configurations</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {bedConfigurations.map((configuration) => (
            <label key={configuration} className="flex min-h-11 items-center gap-3 text-sm text-stone-700">
              <input
                type="checkbox"
                name="permittedConfigurations"
                value={configuration}
                defaultChecked={permitted.has(configuration)}
                className="h-5 w-5 rounded border-stone-300 text-brand-moss focus:ring-brand-moss"
              />
              {configurationLabels[configuration]}
            </label>
          ))}
        </div>
      </fieldset>
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
      ) : null}
      <button
        type="submit"
        className="min-h-12 rounded-md bg-brand-moss px-4 text-base font-semibold text-white transition hover:bg-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-moss focus:ring-offset-2"
      >
        {bedroom ? "Save bedroom" : "Create bedroom"}
      </button>
    </form>
  );
}

function ConfigurationSelect({ name, defaultValue }: { name: string; defaultValue: (typeof bedConfigurations)[number] }) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="min-h-12 rounded-md border border-stone-300 px-3 text-base outline-none focus:border-brand-moss focus:ring-2 focus:ring-brand-moss/20"
    >
      {bedConfigurations.map((configuration) => (
        <option key={configuration} value={configuration}>
          {configurationLabels[configuration]}
        </option>
      ))}
    </select>
  );
}
