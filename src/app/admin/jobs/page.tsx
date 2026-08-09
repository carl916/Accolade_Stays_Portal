import { requireRole } from "@/lib/auth/session";
import { RefreshCw } from "lucide-react";
import { canManageSettings } from "@/lib/domain/operations";
import { syncSmoobuBookingsNow } from "@/lib/admin/smoobu-actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { JobsCalendarClient } from "@/components/admin/JobsCalendarClient";
import { createSmoobuClient, SmoobuConfigurationError } from "@/lib/smoobu/client";

type CleaningJobRow = Pick<
  Database["public"]["Tables"]["cleaning_jobs"]["Row"],
  | "id"
  | "property_id"
  | "scheduled_date"
  | "expected_start_time"
  | "status"
  | "cleaning_type"
  | "assigned_cleaner_id"
  | "assigned_cleaner_name"
  | "completed_at"
  | "requires_review"
  | "smoobu_booking_id"
  | "booking_change_requires_review"
  | "booking_change_reason"
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

type BookingRow = Pick<
  Database["public"]["Tables"]["smoobu_bookings"]["Row"],
  | "id"
  | "property_id"
  | "smoobu_reservation_id"
  | "smoobu_reference_id"
  | "smoobu_apartment_id"
  | "smoobu_apartment_name"
  | "channel_name"
  | "booking_type"
  | "arrival_date"
  | "departure_date"
  | "previous_arrival_date"
  | "previous_departure_date"
  | "check_in_time"
  | "check_out_time"
  | "guest_name"
  | "guest_email"
  | "guest_phone"
  | "adults"
  | "children"
  | "guest_language"
  | "guest_id"
  | "guest_app_url"
  | "notice"
  | "is_cancelled"
  | "clean_review_required"
  | "clean_review_reason"
  | "last_synced_at"
  | "messages_need_refresh"
>;

type SyncRunRow = Pick<
  Database["public"]["Tables"]["smoobu_sync_runs"]["Row"],
  | "status"
  | "completed_at"
  | "last_successful_sync_at"
  | "error_message"
  | "records_created"
  | "records_updated"
  | "records_cancelled"
  | "records_failed"
>;

type MappingRow = Pick<
  Database["public"]["Tables"]["smoobu_property_mappings"]["Row"],
  "smoobu_apartment_id" | "is_active"
>;

type AdminJobsPageProps = {
  searchParams?: Promise<{
    addClean?: string;
    propertyId?: string;
    scheduledDate?: string;
    propertyLocked?: string;
    bookingId?: string;
    error?: string;
  }>;
};

function getSafeDateParam(value: string | undefined) {
  const match = value?.match(/^\d{4}-\d{2}-\d{2}/);

  return match?.[0];
}

function getRecoveredError(params: Awaited<AdminJobsPageProps["searchParams"]>) {
  if (params?.error) {
    return params.error;
  }

  const scheduledDate = params?.scheduledDate;
  const embeddedError = scheduledDate?.match(/[?&]error=([^&]+)/)?.[1];

  return embeddedError ? decodeURIComponent(embeddedError.replace(/\+/g, " ")) : undefined;
}

function formatUkDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
    timeZoneName: "short"
  }).format(new Date(value));
}

export default async function AdminJobsPage({ searchParams }: AdminJobsPageProps) {
  const profile = await requireRole(["administrator", "cleaning_manager"]);
  const canManageSmoobu = canManageSettings(profile.role);
  const resolvedSearchParams = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [
    { data: jobData, error: jobsError },
    { data: propertyData },
    { data: bedroomData },
    { data: bookingData },
    { data: syncRunData },
    { data: mappingData }
  ] = await Promise.all([
    supabase
      .from("cleaning_jobs")
      .select(
        "id,property_id,scheduled_date,expected_start_time,status,cleaning_type,assigned_cleaner_id,assigned_cleaner_name,completed_at,requires_review,smoobu_booking_id,booking_change_requires_review,booking_change_reason,properties(name)"
      )
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
      .order("name"),
    supabase
      .from("smoobu_bookings")
      .select(
        "id,property_id,smoobu_reservation_id,smoobu_reference_id,smoobu_apartment_id,smoobu_apartment_name,channel_name,booking_type,arrival_date,departure_date,previous_arrival_date,previous_departure_date,check_in_time,check_out_time,guest_name,guest_email,guest_phone,adults,children,guest_language,guest_id,guest_app_url,notice,is_cancelled,clean_review_required,clean_review_reason,last_synced_at,messages_need_refresh"
      )
      .eq("is_blocked_booking", false)
      .eq("is_cancelled", false)
      .is("source_deleted_at", null)
      .order("arrival_date", { ascending: true }),
    supabase
      .from("smoobu_sync_runs")
      .select("status,completed_at,last_successful_sync_at,error_message,records_created,records_updated,records_cancelled,records_failed")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("smoobu_property_mappings")
      .select("smoobu_apartment_id,is_active")
      .eq("provider", "smoobu")
  ]);
  const jobs = (jobData ?? []) as CleaningJobRow[];
  const properties = (propertyData ?? []) as PropertyRow[];
  const bedrooms = (bedroomData ?? []) as BedroomRow[];
  const bookings = (bookingData ?? []) as BookingRow[];
  const latestSyncRun = syncRunData as SyncRunRow | null;
  const mappings = (mappingData ?? []) as MappingRow[];

  const bedroomsByPropertyId = new Map<string, BedroomRow[]>();
  for (const bedroom of bedrooms) {
    bedroomsByPropertyId.set(bedroom.property_id, [...(bedroomsByPropertyId.get(bedroom.property_id) ?? []), bedroom]);
  }

  let unmappedApartmentCount = 0;
  let integrationWarning: string | undefined;
  if (canManageSmoobu) {
    try {
      const apartments = await createSmoobuClient().getApartments();
      const activeMappedApartmentIds = new Set(
        mappings.filter((mapping) => mapping.is_active).map((mapping) => mapping.smoobu_apartment_id)
      );
      unmappedApartmentCount = apartments.filter((apartment) => !activeMappedApartmentIds.has(apartment.id)).length;
    } catch (error) {
      integrationWarning =
        error instanceof SmoobuConfigurationError
          ? "Smoobu credentials are not configured."
          : "Smoobu apartment status could not be refreshed.";
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-normal text-brand-moss">
          {profile.role === "administrator" ? "Administrator" : "Cleaning manager"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-brand-ink">Calendar</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Schedule planned cleans from the calendar and review upcoming work across every property.
        </p>
      </div>

      {jobsError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {jobsError.message}
        </p>
      ) : null}

      {canManageSmoobu ? (
        <section className="flex items-center justify-between gap-3 rounded-md border border-brand-border/80 bg-white/70 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-xs text-stone-500">
              <span className="font-semibold text-stone-600">Smoobu</span>
              {" - "}
              {latestSyncRun?.last_successful_sync_at
                ? `Synced ${formatUkDateTime(latestSyncRun.last_successful_sync_at)}`
                : "No successful sync yet"}
              {" - "}
              {mappings.filter((mapping) => mapping.is_active).length} mapped
              {unmappedApartmentCount > 0 ? ` - ${unmappedApartmentCount} unmapped` : ""}
            </p>
            {latestSyncRun?.error_message || integrationWarning ? (
              <p className="mt-1 truncate text-xs font-medium text-amber-700">
                {latestSyncRun?.error_message ?? integrationWarning}
              </p>
            ) : null}
          </div>
          <form action={syncSmoobuBookingsNow} className="shrink-0">
            <button
              type="submit"
              aria-label="Sync Smoobu now"
              title="Sync Smoobu now"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-brand-border bg-white text-brand-primary transition hover:border-brand-slate hover:bg-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </section>
      ) : null}

      <JobsCalendarClient
        initialError={getRecoveredError(resolvedSearchParams)}
        canCreateManualClean={profile.role === "administrator"}
        jobDetailBasePath={profile.role === "administrator" ? "/admin/jobs" : "/manager/jobs"}
        initialModal={{
          isOpen: resolvedSearchParams?.addClean === "1" || Boolean(getRecoveredError(resolvedSearchParams)),
          scheduledDate: getSafeDateParam(resolvedSearchParams?.scheduledDate),
          propertyId: resolvedSearchParams?.propertyId,
          propertyLocked: resolvedSearchParams?.propertyLocked === "1",
          bookingId: resolvedSearchParams?.bookingId
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
          expectedStartTime: job.expected_start_time,
          cleaningType: job.cleaning_type,
          status: job.status,
          assignedCleanerName: job.assigned_cleaner_name,
          completedAt: job.completed_at,
          requiresReview: job.requires_review,
          bookingId: job.smoobu_booking_id,
          bookingChangeRequiresReview: job.booking_change_requires_review,
          bookingChangeReason: job.booking_change_reason
        }))}
        bookings={bookings.map((booking) => ({
          id: booking.id,
          propertyId: booking.property_id,
          propertyName:
            properties.find((property) => property.id === booking.property_id)?.name ?? booking.smoobu_apartment_name,
          smoobuReservationId: booking.smoobu_reservation_id,
          smoobuReferenceId: booking.smoobu_reference_id,
          smoobuApartmentName: booking.smoobu_apartment_name,
          channelName: booking.channel_name,
          bookingType: booking.booking_type,
          arrivalDate: booking.arrival_date,
          departureDate: booking.departure_date,
          previousArrivalDate: booking.previous_arrival_date,
          previousDepartureDate: booking.previous_departure_date,
          checkInTime: booking.check_in_time,
          checkOutTime: booking.check_out_time,
          guestName: booking.guest_name,
          guestEmail: booking.guest_email,
          guestPhone: booking.guest_phone,
          adults: booking.adults,
          children: booking.children,
          guestLanguage: booking.guest_language,
          guestId: booking.guest_id,
          guestAppUrl: booking.guest_app_url,
          notice: booking.notice,
          cleanReviewRequired: booking.clean_review_required,
          cleanReviewReason: booking.clean_review_reason,
          lastSyncedAt: booking.last_synced_at,
          messagesNeedRefresh: booking.messages_need_refresh,
          linkedJobs: jobs
            .filter((job) => job.smoobu_booking_id === booking.id)
            .map((job) => ({
              id: job.id,
              scheduledDate: job.scheduled_date,
              status: job.status,
              cleaningType: job.cleaning_type,
              bookingChangeRequiresReview: job.booking_change_requires_review,
              bookingChangeReason: job.booking_change_reason
            }))
        }))}
      />
    </section>
  );
}
