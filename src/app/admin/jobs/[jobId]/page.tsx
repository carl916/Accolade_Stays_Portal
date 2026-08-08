import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import {
  CleaningJobReview,
  type CleaningJobReviewAuditEvent,
  type CleaningJobReviewBedroom,
  type CleaningJobReviewCleaner,
  type CleaningJobReviewComment
} from "@/components/cleaning/CleaningJobReview";

type JobRow = Pick<
  Database["public"]["Tables"]["cleaning_jobs"]["Row"],
  | "id"
  | "property_id"
  | "scheduled_date"
  | "expected_start_time"
  | "expected_duration_minutes"
  | "cleaning_type"
  | "status"
  | "instructions"
  | "notes"
  | "assigned_cleaner_id"
  | "assigned_cleaner_name"
  | "assigned_cleaner_type"
  | "assigned_cleaner_labour_multiplier"
  | "working_mode"
  | "effective_labour_multiplier"
  | "started_at"
  | "completed_at"
  | "actual_duration_minutes"
  | "actual_labour_minutes"
  | "requires_review"
  | "booking_change_requires_review"
  | "booking_change_reason"
> & {
  properties: Pick<Database["public"]["Tables"]["properties"]["Row"], "name"> | null;
  assigned_cleaner: Pick<Database["public"]["Tables"]["profiles"]["Row"], "full_name" | "cleaner_type"> | null;
  smoobu_bookings: Pick<Database["public"]["Tables"]["smoobu_bookings"]["Row"], "check_out_time" | "guest_name"> | null;
};
type JobBedroomRow = Pick<
  Database["public"]["Tables"]["cleaning_job_bedrooms"]["Row"],
  "id" | "bedroom_name" | "assumed_current_configuration" | "required_configuration"
> & {
  bedrooms: {
    bedroom_permitted_configurations: Pick<
      Database["public"]["Tables"]["bedroom_permitted_configurations"]["Row"],
      "configuration" | "is_active"
    >[];
  } | null;
};
type NextBookingRow = Pick<Database["public"]["Tables"]["smoobu_bookings"]["Row"], "guest_name" | "check_in_time">;
type CleanerRow = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "email" | "cleaner_type">;
type CommentRow = Pick<Database["public"]["Tables"]["cleaning_job_comments"]["Row"], "id" | "body" | "created_at"> & {
  author: Pick<Database["public"]["Tables"]["profiles"]["Row"], "full_name"> | null;
};
type AuditEventRow = Pick<
  Database["public"]["Tables"]["cleaning_job_audit_events"]["Row"],
  "id" | "action" | "previous_value" | "new_value" | "created_at"
> & {
  actor: Pick<Database["public"]["Tables"]["profiles"]["Row"], "full_name"> | null;
};

type JobDetailPageProps = {
  params: Promise<{ jobId: string }>;
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

function getPermittedConfigurations(bedroom: JobBedroomRow) {
  const configurations =
    bedroom.bedrooms?.bedroom_permitted_configurations
      .filter((configuration) => configuration.is_active)
      .map((configuration) => configuration.configuration) ?? [];
  const combined = [
    ...configurations,
    bedroom.assumed_current_configuration,
    bedroom.required_configuration
  ];

  return [...new Set(combined)];
}

export default async function JobDetailPage({ params, searchParams }: JobDetailPageProps) {
  const profile = await requireRole(["administrator"]);
  const { jobId } = await params;
  const resolvedSearchParams = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: jobData } = await supabase
    .from("cleaning_jobs")
    .select(
      "id,property_id,scheduled_date,expected_start_time,expected_duration_minutes,cleaning_type,status,instructions,notes,assigned_cleaner_id,assigned_cleaner_name,assigned_cleaner_type,assigned_cleaner_labour_multiplier,working_mode,effective_labour_multiplier,started_at,completed_at,actual_duration_minutes,actual_labour_minutes,requires_review,booking_change_requires_review,booking_change_reason,properties(name),assigned_cleaner:profiles!cleaning_jobs_assigned_cleaner_id_fkey(full_name,cleaner_type),smoobu_bookings(check_out_time,guest_name)"
    )
    .eq("id", jobId)
    .maybeSingle();
  const job = jobData as JobRow | null;

  if (!job) {
    notFound();
  }

  const nextBookingQuery = supabase
    .from("smoobu_bookings")
    .select("guest_name,check_in_time")
    .eq("property_id", job.property_id)
    .eq("arrival_date", job.scheduled_date)
    .eq("is_cancelled", false)
    .is("source_deleted_at", null)
    .order("check_in_time", { ascending: true })
    .limit(1)
    .maybeSingle();

  const [
    { data: bedroomData },
    { data: cleanerData },
    { data: commentData },
    { data: auditData },
    { data: nextBookingData }
  ] = await Promise.all([
    supabase
      .from("cleaning_job_bedrooms")
      .select("id,bedroom_name,assumed_current_configuration,required_configuration,bedrooms(bedroom_permitted_configurations(configuration,is_active))")
      .eq("cleaning_job_id", job.id)
      .order("bedroom_name"),
    supabase
      .from("profiles")
      .select("id,full_name,email,cleaner_type")
      .eq("role", "cleaner")
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("cleaning_job_comments")
      .select("id,body,created_at,author:profiles!cleaning_job_comments_author_id_fkey(full_name)")
      .eq("cleaning_job_id", job.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("cleaning_job_audit_events")
      .select("id,action,previous_value,new_value,created_at,actor:profiles!cleaning_job_audit_events_user_id_fkey(full_name)")
      .eq("cleaning_job_id", job.id)
      .order("created_at", { ascending: false })
      .limit(20),
    nextBookingQuery
  ]);
  const bedrooms = (bedroomData ?? []) as JobBedroomRow[];
  const cleaners = (cleanerData ?? []) as CleanerRow[];
  const comments = (commentData ?? []) as CommentRow[];
  const auditEvents = (auditData ?? []) as AuditEventRow[];
  const nextBooking = nextBookingData as NextBookingRow | null;
  const reviewBedrooms: CleaningJobReviewBedroom[] = bedrooms.map((bedroom) => ({
    id: bedroom.id,
    name: bedroom.bedroom_name,
    currentConfiguration: bedroom.assumed_current_configuration,
    requiredConfiguration: bedroom.required_configuration,
    permittedConfigurations: getPermittedConfigurations(bedroom)
  }));
  const reviewCleaners: CleaningJobReviewCleaner[] = cleaners
    .filter((cleaner) => cleaner.cleaner_type)
    .map((cleaner) => ({
      id: cleaner.id,
      fullName: cleaner.full_name,
      email: cleaner.email,
      cleanerType: cleaner.cleaner_type ?? "individual"
    }));
  const reviewComments: CleaningJobReviewComment[] = comments.map((comment) => ({
    id: comment.id,
    body: comment.body,
    createdAt: comment.created_at,
    authorName: comment.author?.full_name ?? "Unknown user"
  }));
  const reviewAuditEvents: CleaningJobReviewAuditEvent[] = auditEvents.map((event) => ({
    id: event.id,
    action: event.action,
    previousValue: event.previous_value,
    newValue: event.new_value,
    createdAt: event.created_at,
    actorName: event.actor?.full_name ?? null
  }));

  return (
    <CleaningJobReview
      job={{
        id: job.id,
        propertyName: job.properties?.name ?? "Unknown property",
        scheduledDate: job.scheduled_date,
        expectedStartTime: job.expected_start_time,
        expectedDurationMinutes: job.expected_duration_minutes,
        cleaningType: job.cleaning_type,
        status: job.status,
        instructions: job.instructions,
        notes: job.notes,
        assignedCleanerId: job.assigned_cleaner_id,
        assignedCleanerName: job.assigned_cleaner_name ?? job.assigned_cleaner?.full_name ?? null,
        assignedCleanerType: job.assigned_cleaner_type ?? job.assigned_cleaner?.cleaner_type ?? null,
        assignedCleanerLabourMultiplier: job.assigned_cleaner_labour_multiplier,
        workingMode: job.working_mode,
        effectiveLabourMultiplier: job.effective_labour_multiplier,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        actualDurationMinutes: job.actual_duration_minutes,
        actualLabourMinutes: job.actual_labour_minutes,
        requiresReview: job.requires_review,
        bookingChangeRequiresReview: job.booking_change_requires_review,
        bookingChangeReason: job.booking_change_reason,
        checkoutTime: job.smoobu_bookings?.check_out_time ?? job.expected_start_time,
        nextArrivalTime: nextBooking?.check_in_time ?? null,
        nextArrivalGuestName: nextBooking?.guest_name ?? null
      }}
      bedrooms={reviewBedrooms}
      cleaners={reviewCleaners}
      comments={reviewComments}
      auditEvents={reviewAuditEvents}
      currentRole={profile.role}
      backHref="/admin/jobs"
      backLabel="Cleaning jobs"
      returnPath={`/admin/jobs/${job.id}`}
      error={resolvedSearchParams?.error}
      success={resolvedSearchParams?.success}
    />
  );
}
