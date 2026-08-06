import { ArrowLeft, BedDouble, CalendarClock } from "lucide-react";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { formatBedConfiguration, getBedConfigurationAction } from "@/lib/domain/operations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type JobRow = Database["public"]["Tables"]["cleaning_jobs"]["Row"] & {
  properties: Pick<Database["public"]["Tables"]["properties"]["Row"], "name"> | null;
};
type JobBedroomRow = Database["public"]["Tables"]["cleaning_job_bedrooms"]["Row"];

const statusLabels = {
  awaiting_approval: "Awaiting approval",
  awaiting_cleaner_response: "Awaiting cleaner response",
  accepted: "Accepted",
  in_progress: "In progress",
  completed: "Completed",
  requires_review: "Requires review",
  cancelled: "Cancelled"
} satisfies Record<Database["public"]["Enums"]["cleaning_job_status"], string>;

export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  await requireRole(["administrator"]);
  const { jobId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: jobData } = await supabase.from("cleaning_jobs").select("*,properties(name)").eq("id", jobId).maybeSingle();
  const job = jobData as JobRow | null;

  if (!job) {
    notFound();
  }

  const { data: bedroomData } = await supabase
    .from("cleaning_job_bedrooms")
    .select("*")
    .eq("cleaning_job_id", job.id)
    .order("bedroom_name");
  const bedrooms = (bedroomData ?? []) as JobBedroomRow[];

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <Link href="/admin/jobs" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-moss">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Cleaning jobs
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-brand-ink">{job.properties?.name ?? "Cleaning job"}</h1>
      </div>

      <div className="grid gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-2">
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-1 h-5 w-5 text-brand-moss" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-brand-ink">Date</p>
            <p className="text-sm text-stone-600">
              {format(parseISO(job.scheduled_date), "d MMM yyyy")}
              {job.expected_start_time ? ` at ${job.expected_start_time.slice(0, 5)}` : ""}
            </p>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-ink">Current status</p>
          <p className="text-sm text-stone-600">{statusLabels[job.status]}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-ink">Expected duration</p>
          <p className="text-sm text-stone-600">{job.expected_duration_minutes} minutes</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-ink">Next action</p>
          <p className="text-sm text-stone-600">Cleaning manager approval and cleaner assignment</p>
        </div>
      </div>

      <div className="grid gap-3">
        <h2 className="text-xl font-semibold text-brand-ink">Bedroom snapshots</h2>
        {bedrooms.map((bedroom) => (
          <div key={bedroom.id} className="grid gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <BedDouble className="mt-1 h-5 w-5 text-brand-moss" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-brand-ink">{bedroom.bedroom_name}</h3>
                <p className="mt-1 text-sm text-stone-600">
                  Current: {formatBedConfiguration(bedroom.assumed_current_configuration)}
                </p>
                <p className="text-sm text-stone-600">
                  Required: {formatBedConfiguration(bedroom.required_configuration)}
                </p>
              </div>
            </div>
            <p className="rounded-md bg-brand-mint px-3 py-2 text-sm font-semibold text-brand-moss">
              Action:{" "}
              {getBedConfigurationAction({
                currentConfiguration: bedroom.assumed_current_configuration,
                requiredConfiguration: bedroom.required_configuration
              })}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
