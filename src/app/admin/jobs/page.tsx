import { CalendarClock, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type CleaningJobRow = Pick<
  Database["public"]["Tables"]["cleaning_jobs"]["Row"],
  "id" | "scheduled_date" | "expected_start_time" | "status" | "cleaning_type" | "expected_duration_minutes"
> & {
  properties: Pick<Database["public"]["Tables"]["properties"]["Row"], "name"> | null;
};

const statusLabels = {
  awaiting_approval: "Awaiting approval",
  awaiting_cleaner_response: "Awaiting cleaner response",
  accepted: "Accepted",
  in_progress: "In progress",
  completed: "Completed",
  requires_review: "Requires review",
  cancelled: "Cancelled"
} satisfies Record<Database["public"]["Enums"]["cleaning_job_status"], string>;

const cleaningTypeLabels = {
  standard_changeover: "Standard changeover",
  mid_stay_clean: "Mid-stay clean",
  deep_or_remedial_clean: "Deep or remedial clean",
  other: "Other"
} satisfies Record<Database["public"]["Enums"]["cleaning_type"], string>;

export default async function AdminJobsPage() {
  await requireRole(["administrator"]);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cleaning_jobs")
    .select("id,scheduled_date,expected_start_time,status,cleaning_type,expected_duration_minutes,properties(name)")
    .order("scheduled_date", { ascending: true })
    .limit(50);
  const jobs = (data ?? []) as CleaningJobRow[];

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-brand-moss">Administrator</p>
          <h1 className="mt-2 text-3xl font-semibold text-brand-ink">Cleaning jobs</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            Create planned cleans and review the current schedule.
          </p>
        </div>
        <Link
          href="/admin/jobs/new"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-moss px-4 text-sm font-semibold text-white transition hover:bg-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-moss focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New clean
        </Link>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error.message}
        </p>
      ) : null}

      <div className="grid gap-3">
        {jobs.length === 0 ? (
          <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-brand-ink">No cleaning jobs yet</p>
            <p className="mt-1 text-sm text-stone-600">Create the first planned clean once bedrooms are configured.</p>
          </div>
        ) : null}

        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/admin/jobs/${job.id}`}
            className="flex min-h-28 flex-col justify-between gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition hover:border-brand-moss hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-moss focus:ring-offset-2 sm:flex-row sm:items-center"
          >
            <div className="flex items-start gap-3">
              <CalendarClock className="mt-1 h-5 w-5 text-brand-moss" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-semibold text-brand-ink">{job.properties?.name ?? "Unknown property"}</h2>
                <p className="mt-1 text-sm text-stone-600">
                  {format(parseISO(job.scheduled_date), "d MMM yyyy")}
                  {job.expected_start_time ? ` at ${job.expected_start_time.slice(0, 5)}` : ""}
                </p>
                <p className="mt-2 text-sm text-stone-600">
                  {cleaningTypeLabels[job.cleaning_type]} · {job.expected_duration_minutes} minutes
                </p>
              </div>
            </div>
            <span className="inline-flex w-fit rounded-full bg-brand-mint px-3 py-1 text-sm font-semibold text-brand-moss">
              {statusLabels[job.status]}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
