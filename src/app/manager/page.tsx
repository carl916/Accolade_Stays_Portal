import { AlertTriangle, BedDouble, CalendarClock, UserCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/session";
import {
  formatBedConfiguration,
  formatCleaningDurationForClean,
  getBedConfigurationAction,
  getCleaningJobStatusLabel,
  isCleaningJobNeedsManagerReview
} from "@/lib/domain/operations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type QueueJobRow = Pick<
  Database["public"]["Tables"]["cleaning_jobs"]["Row"],
  | "id"
  | "scheduled_date"
  | "expected_start_time"
  | "guest_arrival_deadline"
  | "expected_duration_minutes"
  | "status"
  | "assigned_cleaner_id"
  | "requires_review"
  | "booking_change_requires_review"
  | "booking_change_reason"
> & {
  properties: Pick<Database["public"]["Tables"]["properties"]["Row"], "name"> | null;
  assigned_cleaner: Pick<Database["public"]["Tables"]["profiles"]["Row"], "full_name"> | null;
  smoobu_bookings: Pick<Database["public"]["Tables"]["smoobu_bookings"]["Row"], "check_out_time"> | null;
  cleaning_job_bedrooms: Pick<
    Database["public"]["Tables"]["cleaning_job_bedrooms"]["Row"],
    "id" | "bedroom_name" | "assumed_current_configuration" | "required_configuration"
  >[];
};

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateHeading(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date(`${value}T00:00:00`));
}

function formatTime(value: string | null, fallback = "Not set") {
  return value ? value.slice(0, 5) : fallback;
}

function formatDeadlineTime(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London"
  }).format(new Date(value));
}

function getChangedBedrooms(job: QueueJobRow) {
  return job.cleaning_job_bedrooms.filter(
    (bedroom) => bedroom.assumed_current_configuration !== bedroom.required_configuration
  );
}

function sortJobs(left: QueueJobRow, right: QueueJobRow) {
  return `${left.scheduled_date} ${formatTime(left.expected_start_time, "99:99")} ${
    left.properties?.name ?? ""
  }`.localeCompare(`${right.scheduled_date} ${formatTime(right.expected_start_time, "99:99")} ${right.properties?.name ?? ""}`);
}

function QueueCard({ job, actionLabel }: { job: QueueJobRow; actionLabel: string }) {
  const changedBedrooms = getChangedBedrooms(job);
  const firstChange = changedBedrooms[0];
  const nextArrivalTime = formatDeadlineTime(job.guest_arrival_deadline);

  return (
    <article className="grid gap-3 rounded-md border border-brand-border bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-brand-ink">{job.properties?.name ?? "Unknown property"}</h3>
          <p className="text-sm text-stone-600">{formatDateHeading(job.scheduled_date)}</p>
        </div>
        <span className="inline-flex w-fit rounded-md bg-brand-muted px-2.5 py-1 text-xs font-semibold text-brand-darkSlate">
          {getCleaningJobStatusLabel({
            status: job.status,
            assignedCleanerName: job.assigned_cleaner?.full_name ?? null,
            requiresReview: job.requires_review,
            bookingChangeRequiresReview: job.booking_change_requires_review
          })}
        </span>
      </div>

      <div className="grid gap-2 text-sm text-stone-700 sm:grid-cols-3">
        <p>
          <span className="font-semibold text-brand-ink">Checkout</span>
          <br />
          {formatTime(job.smoobu_bookings?.check_out_time ?? job.expected_start_time)}
        </p>
        <p>
          <span className="font-semibold text-brand-ink">Next arrival</span>
          <br />
          {nextArrivalTime ?? "No same-day arrival"}
        </p>
        <p>
          <span className="font-semibold text-brand-ink">Expected</span>
          <br />
          {formatCleaningDurationForClean(job.expected_duration_minutes)}
        </p>
      </div>

      {firstChange ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-normal text-amber-900">
            <BedDouble className="h-3.5 w-3.5" aria-hidden="true" />
            Bed change
          </p>
          <p className="mt-1 text-sm font-semibold text-amber-950">
            {firstChange.bedroom_name}: {formatBedConfiguration(firstChange.assumed_current_configuration)} -&gt;{" "}
            {formatBedConfiguration(firstChange.required_configuration)}
          </p>
          <p className="text-sm font-semibold text-amber-900">
            {getBedConfigurationAction({
              currentConfiguration: firstChange.assumed_current_configuration,
              requiredConfiguration: firstChange.required_configuration
            })}
            {changedBedrooms.length > 1 ? `, plus ${changedBedrooms.length - 1} more` : ""}
          </p>
        </div>
      ) : null}

      {job.booking_change_requires_review && job.booking_change_reason ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
          Booking change: {job.booking_change_reason}
        </p>
      ) : null}

      <Link
        href={`/manager/jobs/${job.id}`}
        className="inline-flex min-h-11 items-center justify-center justify-self-start rounded-md bg-brand-primary px-4 text-sm font-semibold text-brand-primaryForeground transition hover:bg-brand-primaryHover focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2"
      >
        {actionLabel}
      </Link>
    </article>
  );
}

function QueueSection({
  title,
  icon,
  jobs,
  actionLabel,
  emptyText
}: {
  title: string;
  icon: ReactNode;
  jobs: QueueJobRow[];
  actionLabel: string;
  emptyText: string;
}) {
  return (
    <section className="grid gap-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold text-brand-ink">
          {title} <span className="text-sm font-semibold text-stone-500">{jobs.length}</span>
        </h2>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {jobs.length > 0 ? (
          jobs.map((job) => <QueueCard key={job.id} job={job} actionLabel={actionLabel} />)
        ) : (
          <p className="rounded-md border border-brand-border bg-white px-3 py-3 text-sm text-stone-600">{emptyText}</p>
        )}
      </div>
    </section>
  );
}

export default async function ManagerPage() {
  const profile = await requireRole(["cleaning_manager"]);
  const todayValue = toDateValue(new Date());
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cleaning_jobs")
    .select(
      "id,scheduled_date,expected_start_time,guest_arrival_deadline,expected_duration_minutes,status,assigned_cleaner_id,requires_review,booking_change_requires_review,booking_change_reason,properties(name),assigned_cleaner:profiles!cleaning_jobs_assigned_cleaner_id_fkey(full_name),smoobu_bookings(check_out_time),cleaning_job_bedrooms(id,bedroom_name,assumed_current_configuration,required_configuration)"
    )
    .neq("status", "cancelled")
    .order("scheduled_date", { ascending: true });
  const jobs = ((data ?? []) as QueueJobRow[]).sort(sortJobs);
  const needsReviewJobs = jobs
    .filter((job) =>
      isCleaningJobNeedsManagerReview({
        status: job.status,
        requiresReview: job.requires_review,
        bookingChangeRequiresReview: job.booking_change_requires_review
      })
    )
    .slice(0, 8);
  const needsCleanerJobs = jobs
    .filter((job) => job.status === "awaiting_cleaner_response" && !job.assigned_cleaner_id)
    .slice(0, 8);
  const upcomingJobs = jobs
    .filter(
      (job) =>
        job.scheduled_date >= todayValue &&
        job.status !== "awaiting_approval" &&
        job.status !== "completed" &&
        (job.assigned_cleaner_id || job.status === "awaiting_cleaner_response")
    )
    .slice(0, 10);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-normal text-brand-moss">Cleaning manager</p>
        <h1 className="mt-2 text-3xl font-semibold text-brand-ink">Work queue</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Signed in as {profile.full_name}. Review cleans, confirm the setup, and assign cleaners.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error.message}
        </p>
      ) : null}

      <QueueSection
        title="Needs review"
        icon={<AlertTriangle className="h-5 w-5 text-amber-700" aria-hidden="true" />}
        jobs={needsReviewJobs}
        actionLabel="Review"
        emptyText="No cleans are waiting for review."
      />
      <QueueSection
        title="Confirmed - needs cleaner"
        icon={<UserCheck className="h-5 w-5 text-brand-moss" aria-hidden="true" />}
        jobs={needsCleanerJobs}
        actionLabel="Assign cleaner"
        emptyText="No confirmed cleans are waiting for a cleaner."
      />
      <QueueSection
        title="Upcoming"
        icon={<CalendarClock className="h-5 w-5 text-brand-moss" aria-hidden="true" />}
        jobs={upcomingJobs}
        actionLabel="Open"
        emptyText="No upcoming confirmed or assigned cleans."
      />
    </section>
  );
}
