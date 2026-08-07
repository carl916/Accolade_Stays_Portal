import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { JobsCalendarClient } from "@/components/admin/JobsCalendarClient";

type CleaningJobRow = Pick<
  Database["public"]["Tables"]["cleaning_jobs"]["Row"],
  "id" | "property_id" | "scheduled_date" | "status" | "cleaning_type"
> & {
  properties: Pick<Database["public"]["Tables"]["properties"]["Row"], "name"> | null;
};

type PropertyRow = Pick<
  Database["public"]["Tables"]["properties"]["Row"],
  "id" | "name" | "default_cleaning_duration_minutes"
>;

type BedroomRow = Pick<
  Database["public"]["Tables"]["bedrooms"]["Row"],
  "id" | "property_id" | "name" | "physical_bed_type" | "current_configuration"
> & {
  bedroom_permitted_configurations: Pick<
    Database["public"]["Tables"]["bedroom_permitted_configurations"]["Row"],
    "configuration" | "is_active"
  >[];
};

type AdminJobsPageProps = {
  searchParams?: Promise<{
    addClean?: string;
    propertyId?: string;
    scheduledDate?: string;
    error?: string;
  }>;
};

export default async function AdminJobsPage({ searchParams }: AdminJobsPageProps) {
  await requireRole(["administrator"]);
  const resolvedSearchParams = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [{ data: jobData, error: jobsError }, { data: propertyData }, { data: bedroomData }] = await Promise.all([
    supabase
      .from("cleaning_jobs")
      .select("id,property_id,scheduled_date,status,cleaning_type,properties(name)")
      .order("scheduled_date", { ascending: true }),
    supabase
      .from("properties")
      .select("id,name,default_cleaning_duration_minutes")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("bedrooms")
      .select("id,property_id,name,physical_bed_type,current_configuration,bedroom_permitted_configurations(configuration,is_active)")
      .eq("is_active", true)
      .order("name")
  ]);
  const jobs = (jobData ?? []) as CleaningJobRow[];
  const properties = (propertyData ?? []) as PropertyRow[];
  const bedrooms = (bedroomData ?? []) as BedroomRow[];

  const bedroomsByPropertyId = new Map<string, BedroomRow[]>();
  for (const bedroom of bedrooms) {
    bedroomsByPropertyId.set(bedroom.property_id, [...(bedroomsByPropertyId.get(bedroom.property_id) ?? []), bedroom]);
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-normal text-brand-moss">Administrator</p>
        <h1 className="mt-2 text-3xl font-semibold text-brand-ink">Cleaning jobs</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Schedule planned cleans from the calendar and review upcoming work across every property.
        </p>
      </div>

      {jobsError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {jobsError.message}
        </p>
      ) : null}

      <JobsCalendarClient
        initialError={resolvedSearchParams?.error}
        initialModal={{
          isOpen: resolvedSearchParams?.addClean === "1" || Boolean(resolvedSearchParams?.error),
          scheduledDate: resolvedSearchParams?.scheduledDate,
          propertyId: resolvedSearchParams?.propertyId
        }}
        properties={properties.map((property) => ({
          id: property.id,
          name: property.name,
          defaultCleaningDurationMinutes: property.default_cleaning_duration_minutes,
          bedrooms: (bedroomsByPropertyId.get(property.id) ?? []).map((bedroom) => ({
            id: bedroom.id,
            name: bedroom.name,
            physicalBedType: bedroom.physical_bed_type,
            currentConfiguration: bedroom.current_configuration,
            permittedConfigurations: bedroom.bedroom_permitted_configurations
              .filter((configuration) => configuration.is_active)
              .map((configuration) => configuration.configuration)
          }))
        }))}
        jobs={jobs.map((job) => ({
          id: job.id,
          propertyId: job.property_id,
          propertyName: job.properties?.name ?? "Unknown property",
          scheduledDate: job.scheduled_date,
          cleaningType: job.cleaning_type,
          status: job.status
        }))}
      />
    </section>
  );
}
