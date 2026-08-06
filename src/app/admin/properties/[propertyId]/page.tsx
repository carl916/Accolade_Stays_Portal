import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BedroomsSection } from "@/components/admin/BedroomsSection";
import { FormSubmitButton } from "@/components/admin/FormSubmitButton";
import { updateProperty } from "@/lib/admin/property-actions";
import { requireRole } from "@/lib/auth/session";
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
    <section className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2">
        <Link href="/admin/properties" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-moss">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Properties
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-brand-ink sm:text-3xl">{property.name}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">
            Maintain property details and bedroom templates used when creating cleaning jobs.
          </p>
        </div>
      </div>

      {resolvedSearchParams?.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {resolvedSearchParams.error}
        </p>
      ) : null}

      <form action={updateProperty} className="grid gap-3 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
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

        <details
          open={hasPropertyMoreDetails(property)}
          className="rounded-md border border-stone-200 bg-stone-50/40"
        >
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
          <div className="flex items-center gap-3 sm:justify-end">
            <span className="text-sm text-stone-500">Saved</span>
            <FormSubmitButton pendingLabel="Saving..." className="sm:w-auto">
              Save changes
            </FormSubmitButton>
          </div>
        </div>
      </form>

      <BedroomsSection propertyId={property.id} bedrooms={bedrooms} errorMessage={bedroomError?.message} />
    </section>
  );
}
