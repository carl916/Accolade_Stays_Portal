import { ArrowLeft, CalendarClock, CheckCircle2, Clock, MessageSquare, Settings2, UserCheck } from "lucide-react";
import Link from "next/link";
import {
  addCleaningJobComment,
  assignCleanerToJob,
  confirmCleaningJob,
  updateCleaningJobReview
} from "@/lib/admin/job-actions";
import {
  calculateActualLabourMinutes,
  calculateElapsedCleaningMinutes,
  calculateExpectedElapsedMinutes,
  calculateLabourVarianceMinutes,
  formatBedConfiguration,
  formatCleaningDurationAsTime,
  formatCleaningDurationForClean,
  getCleanerTypeLabel,
  getCleaningJobStatusLabel,
  getWorkingModeLabel,
  isCleaningJobNeedsManagerReview,
  supportedCleaningDurations,
  type AppRole,
  type BedConfiguration,
  type CleaningJobStatus,
  type CleanerType,
  type CleanerWorkingMode,
  type CleaningType
} from "@/lib/domain/operations";
import type { Json } from "@/lib/supabase/types";
import { FormSubmitButton } from "@/components/admin/FormSubmitButton";
import { BedSetupSummary, type BedSetupSummaryBedroom } from "./BedSetupSummary";

export type CleaningJobReviewJob = {
  id: string;
  propertyName: string;
  scheduledDate: string;
  expectedStartTime: string | null;
  expectedDurationMinutes: number;
  cleaningType: CleaningType;
  status: CleaningJobStatus;
  instructions: string;
  notes: string;
  assignedCleanerId: string | null;
  assignedCleanerName: string | null;
  assignedCleanerType: CleanerType | null;
  assignedCleanerLabourMultiplier: number | null;
  workingMode: CleanerWorkingMode | null;
  effectiveLabourMultiplier: number | null;
  startedAt: string | null;
  completedAt: string | null;
  actualDurationMinutes: number | null;
  actualLabourMinutes: number | null;
  requiresReview: boolean;
  bookingChangeRequiresReview: boolean;
  bookingChangeReason: string | null;
  checkoutTime: string | null;
  nextArrivalTime: string | null;
  nextArrivalGuestName: string | null;
};

export type CleaningJobReviewBedroom = BedSetupSummaryBedroom & {
  permittedConfigurations: BedConfiguration[];
};

export type CleaningJobReviewCleaner = {
  id: string;
  fullName: string;
  email: string | null;
  cleanerType: CleanerType;
};

export type CleaningJobReviewComment = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
};

export type CleaningJobReviewAuditEvent = {
  id: string;
  action: string;
  previousValue: Json | null;
  newValue: Json | null;
  createdAt: string;
  actorName: string | null;
};

type CleaningJobReviewProps = {
  job: CleaningJobReviewJob;
  bedrooms: CleaningJobReviewBedroom[];
  cleaners: CleaningJobReviewCleaner[];
  comments: CleaningJobReviewComment[];
  auditEvents: CleaningJobReviewAuditEvent[];
  currentRole: AppRole;
  backHref: string;
  backLabel: string;
  returnPath: string;
  error?: string;
  success?: string;
};

const cleaningTypeLabels = {
  standard_changeover: "Standard changeover",
  mid_stay_clean: "Mid-stay clean",
  deep_or_remedial_clean: "Deep or remedial clean",
  other: "Other"
} satisfies Record<CleaningType, string>;

function formatDateHeading(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function formatTime(value: string | null, fallback = "Not set") {
  return value ? value.slice(0, 5) : fallback;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London"
  }).format(new Date(value));
}

function formatOptionalDateTime(value: string | null) {
  return value ? formatDateTime(value) : "Not recorded";
}

function getMinutes(time: string | null) {
  if (!time) {
    return null;
  }

  const [hours, minutes] = time.split(":").map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function formatTurnaround(checkoutTime: string | null, nextArrivalTime: string | null) {
  const checkoutMinutes = getMinutes(checkoutTime);
  const arrivalMinutes = getMinutes(nextArrivalTime);

  if (checkoutMinutes === null || arrivalMinutes === null || arrivalMinutes < checkoutMinutes) {
    return null;
  }

  const minutes = arrivalMinutes - checkoutMinutes;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hours`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function getJsonString(value: Json | null, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value[key];
  return typeof candidate === "string" ? candidate : null;
}

function formatAuditEvent(event: CleaningJobReviewAuditEvent) {
  const legacyCleanerAssignedAction = ["cleaning", "resource", "assigned"].join("_");
  const legacyCleanerUnassignedAction = ["cleaning", "resource", "unassigned"].join("_");
  const legacyCleanerNameKey = ["cleaning", "resource", "name"].join("_");

  if (event.action === "clean_created") {
    return "Clean created";
  }

  if (event.action === "status_changed") {
    const status = getJsonString(event.newValue, "status");
    return status ? `Status changed to ${status.replaceAll("_", " ")}` : "Status changed";
  }

  if (event.action === "clean_details_updated") {
    return "Clean details updated";
  }

  if (event.action === "cleaner_assigned") {
    return `Cleaner assigned${getJsonString(event.newValue, "cleaner_name") ? `: ${getJsonString(event.newValue, "cleaner_name")}` : ""}`;
  }

  if (event.action === "cleaner_unassigned") {
    return "Cleaner removed";
  }

  if (event.action === legacyCleanerAssignedAction) {
    const name = getJsonString(event.newValue, legacyCleanerNameKey);
    return `Cleaner assigned${name ? `: ${name}` : ""}`;
  }

  if (event.action === legacyCleanerUnassignedAction) {
    return "Cleaner removed";
  }

  return event.action.replaceAll("_", " ");
}

export function CleaningJobReview({
  job,
  bedrooms,
  cleaners,
  comments,
  auditEvents,
  currentRole,
  backHref,
  backLabel,
  returnPath,
  error,
  success
}: CleaningJobReviewProps) {
  const canManageInternalNotes = currentRole === "administrator" || currentRole === "cleaning_manager";
  const canEditJob = job.status !== "cancelled" && job.status !== "completed";
  const needsReview = isCleaningJobNeedsManagerReview({
    status: job.status,
    requiresReview: job.requiresReview,
    bookingChangeRequiresReview: job.bookingChangeRequiresReview
  });
  const turnaround = formatTurnaround(job.checkoutTime, job.nextArrivalTime);
  const expectedWorkingMinutes = job.assignedCleanerLabourMultiplier
    ? calculateExpectedElapsedMinutes({
        expectedLabourMinutes: job.expectedDurationMinutes,
        labourMultiplier: job.assignedCleanerLabourMultiplier
      })
    : null;
  const elapsedMinutes =
    job.actualDurationMinutes ??
    calculateElapsedCleaningMinutes({
      startedAt: job.startedAt,
      completedAt: job.completedAt
    });
  const actualLabourMinutes =
    job.actualLabourMinutes ??
    (elapsedMinutes === null || !job.effectiveLabourMultiplier
      ? null
      : calculateActualLabourMinutes({
          elapsedMinutes,
          effectiveLabourMultiplier: job.effectiveLabourMultiplier
        }));
  const labourVarianceMinutes = calculateLabourVarianceMinutes({
    expectedLabourMinutes: job.expectedDurationMinutes,
    actualLabourMinutes
  });
  const activity = [
    ...comments.map((comment) => ({
      id: `comment-${comment.id}`,
      type: "comment" as const,
      createdAt: comment.createdAt,
      authorName: comment.authorName,
      body: comment.body
    })),
    ...auditEvents.map((event) => ({
      id: `audit-${event.id}`,
      type: "system" as const,
      createdAt: event.createdAt,
      authorName: event.actorName ?? "System",
      body: formatAuditEvent(event)
    }))
  ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-moss">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {backLabel}
        </Link>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-brand-moss">
              {cleaningTypeLabels[job.cleaningType]}
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-brand-ink">{job.propertyName}</h1>
            <p className="mt-1 text-sm text-stone-600">{formatDateHeading(job.scheduledDate)}</p>
          </div>
          <span className="inline-flex w-fit rounded-md bg-brand-muted px-3 py-2 text-sm font-semibold text-brand-darkSlate">
            {getCleaningJobStatusLabel({
              status: job.status,
              assignedCleanerName: job.assignedCleanerName,
              requiresReview: job.requiresReview,
              bookingChangeRequiresReview: job.bookingChangeRequiresReview
            })}
          </span>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          {success}
        </p>
      ) : null}

      <section className="grid gap-3 rounded-md border border-brand-border bg-white p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-start gap-2">
          <CalendarClock className="mt-0.5 h-4 w-4 text-brand-moss" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-stone-500">Checkout</p>
            <p className="text-sm font-semibold text-brand-ink">{formatTime(job.checkoutTime ?? job.expectedStartTime)}</p>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-stone-500">Next arrival</p>
          <p className="text-sm font-semibold text-brand-ink">
            {job.nextArrivalTime ? formatTime(job.nextArrivalTime) : "No same-day arrival"}
          </p>
          {job.nextArrivalGuestName ? <p className="truncate text-xs text-stone-600">{job.nextArrivalGuestName}</p> : null}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-stone-500">Turnaround</p>
          <p className="text-sm font-semibold text-brand-ink">{turnaround ?? "Not time-critical"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-stone-500">Expected labour</p>
          <p className="text-sm font-semibold text-brand-ink">
            {formatCleaningDurationAsTime(job.expectedDurationMinutes)}
          </p>
          {expectedWorkingMinutes && expectedWorkingMinutes !== job.expectedDurationMinutes ? (
            <p className="text-xs text-stone-600">Approx. {formatCleaningDurationAsTime(expectedWorkingMinutes)} working time</p>
          ) : null}
        </div>
      </section>

      {job.bookingChangeRequiresReview && job.bookingChangeReason ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
          Booking change: {job.bookingChangeReason}
        </p>
      ) : null}

      <BedSetupSummary bedrooms={bedrooms} />

      <section className="grid gap-3 rounded-md border border-brand-border bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-brand-moss" aria-hidden="true" />
          <h2 className="text-base font-semibold text-brand-ink">Assignment</h2>
        </div>
        <p className="text-sm text-stone-700">
          Cleaner: <span className="font-semibold text-brand-ink">{job.assignedCleanerName ?? "Unassigned"}</span>
          {job.assignedCleanerType ? (
            <span className="ml-2 text-xs font-semibold text-stone-500">
              {getCleanerTypeLabel(job.assignedCleanerType)}
            </span>
          ) : null}
        </p>
        {job.assignedCleanerType === "pair" && job.workingMode ? (
          <p className="text-sm text-stone-700">
            Worked: <span className="font-semibold text-brand-ink">{getWorkingModeLabel(job.workingMode)}</span>
          </p>
        ) : null}
        {canEditJob ? (
          <form action={assignCleanerToJob} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
              Cleaner
              <select
                name="cleanerId"
                defaultValue={job.assignedCleanerId ?? ""}
                className="min-h-11 rounded-md border border-brand-border bg-white px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
              >
                <option value="">Unassigned</option>
                {cleaners.map((cleaner) => (
                  <option key={cleaner.id} value={cleaner.id}>
                    {cleaner.fullName} - {getCleanerTypeLabel(cleaner.cleanerType)}
                    {cleaner.email ? ` - ${cleaner.email}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <FormSubmitButton pendingLabel="Assigning..." className="sm:w-auto">
              {job.assignedCleanerId ? "Update cleaner" : "Assign cleaner"}
            </FormSubmitButton>
          </form>
        ) : null}
      </section>

      {job.startedAt || job.completedAt || elapsedMinutes !== null || actualLabourMinutes !== null ? (
        <section className="grid gap-3 rounded-md border border-brand-border bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-moss" aria-hidden="true" />
            <h2 className="text-base font-semibold text-brand-ink">Timing</h2>
          </div>
          <div className="grid gap-2 text-sm text-stone-700 sm:grid-cols-2 lg:grid-cols-4">
            <p>
              <span className="font-semibold text-brand-ink">Started</span>
              <br />
              {formatOptionalDateTime(job.startedAt)}
            </p>
            <p>
              <span className="font-semibold text-brand-ink">Completed</span>
              <br />
              {formatOptionalDateTime(job.completedAt)}
            </p>
            <p>
              <span className="font-semibold text-brand-ink">Elapsed clean</span>
              <br />
              {elapsedMinutes === null ? "Not recorded" : formatCleaningDurationAsTime(elapsedMinutes)}
            </p>
            <p>
              <span className="font-semibold text-brand-ink">Actual labour</span>
              <br />
              {actualLabourMinutes === null ? "Not recorded" : formatCleaningDurationAsTime(actualLabourMinutes)}
            </p>
          </div>
          <div className="grid gap-2 text-sm text-stone-700 sm:grid-cols-3">
            <p>
              <span className="font-semibold text-brand-ink">Expected labour</span>
              <br />
              {formatCleaningDurationAsTime(job.expectedDurationMinutes)}
            </p>
            <p>
              <span className="font-semibold text-brand-ink">Expected working time</span>
              <br />
              {expectedWorkingMinutes === null ? "Assign a team first" : `Approx. ${formatCleaningDurationAsTime(expectedWorkingMinutes)}`}
            </p>
            <p>
              <span className="font-semibold text-brand-ink">Labour variance</span>
              <br />
              {labourVarianceMinutes === null
                ? "Not recorded"
                : `${labourVarianceMinutes >= 0 ? "+" : "-"}${formatCleaningDurationAsTime(Math.abs(labourVarianceMinutes))}`}
            </p>
          </div>
        </section>
      ) : null}

      {canEditJob ? (
        <details className="rounded-md border border-brand-border bg-white shadow-sm">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm font-semibold text-brand-ink">
            <Settings2 className="h-4 w-4 text-brand-darkSlate" aria-hidden="true" />
            Make changes
          </summary>
          <form action={updateCleaningJobReview} className="grid gap-4 border-t border-brand-border p-3">
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
              Expected labour
              <select
                name="expectedDurationMinutes"
                defaultValue={String(job.expectedDurationMinutes)}
                className="min-h-11 rounded-md border border-brand-border bg-white px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
              >
                {supportedCleaningDurations.map((duration) => (
                  <option key={duration} value={duration}>
                    {formatCleaningDurationForClean(duration)}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-2">
              <p className="text-sm font-semibold text-brand-ink">Required bed setup</p>
              {bedrooms.map((bedroom) => (
                <label
                  key={bedroom.id}
                  className="grid gap-2 rounded-md border border-brand-border p-3 text-sm font-medium text-brand-ink sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.5fr)] sm:items-center"
                >
                  <span>
                    {bedroom.name}
                    <span className="mt-0.5 block text-xs font-normal text-stone-600">
                      Current: {formatBedConfiguration(bedroom.currentConfiguration)}
                    </span>
                  </span>
                  <select
                    name={`requiredConfiguration:${bedroom.id}`}
                    defaultValue={bedroom.requiredConfiguration}
                    className="min-h-11 rounded-md border border-brand-border bg-white px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
                  >
                    {bedroom.permittedConfigurations.map((configuration) => (
                      <option key={configuration} value={configuration}>
                        {formatBedConfiguration(configuration)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
              Cleaner instructions
              <textarea
                name="instructions"
                rows={3}
                defaultValue={job.instructions}
                className="rounded-md border border-brand-border px-3 py-2 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
              />
            </label>
            {canManageInternalNotes ? (
              <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
                Internal notes
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={job.notes}
                  className="rounded-md border border-brand-border px-3 py-2 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
                />
              </label>
            ) : null}
            <FormSubmitButton pendingLabel="Saving..." className="sm:w-fit">
              Save changes
            </FormSubmitButton>
          </form>
        </details>
      ) : null}

      <section className="grid gap-3 rounded-md border border-brand-border bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-brand-moss" aria-hidden="true" />
          <h2 className="text-base font-semibold text-brand-ink">Review</h2>
        </div>
        {needsReview && canEditJob ? (
          <form action={confirmCleaningJob} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-ink">Ready to confirm?</p>
              <p className="text-sm text-stone-600">Confirming does not require assigning a cleaner.</p>
            </div>
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <FormSubmitButton pendingLabel="Confirming..." className="sm:w-auto">
              Confirm clean
            </FormSubmitButton>
          </form>
        ) : (
          <p className="text-sm text-stone-700">This clean has been reviewed.</p>
        )}
      </section>

      <section className="grid gap-3 rounded-md border border-brand-border bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-brand-moss" aria-hidden="true" />
          <h2 className="text-base font-semibold text-brand-ink">Activity</h2>
        </div>
        <form action={addCleaningJobComment} className="grid gap-2">
          <input type="hidden" name="jobId" value={job.id} />
          <input type="hidden" name="returnPath" value={returnPath} />
          <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
            Add comment or question
            <textarea
              name="comment"
              rows={3}
              className="rounded-md border border-brand-border px-3 py-2 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
            />
          </label>
          <FormSubmitButton pendingLabel="Posting..." className="sm:w-fit">
            Add comment
          </FormSubmitButton>
        </form>
        <div className="grid gap-2 border-t border-brand-border pt-3">
          {activity.length > 0 ? (
            activity.map((item) => (
              <div
                key={item.id}
                className={`grid gap-1 rounded-md px-3 py-2 ${
                  item.type === "comment" ? "bg-brand-muted" : "bg-white text-stone-600"
                }`}
              >
                <p className="text-sm font-semibold text-brand-ink">
                  {item.authorName}
                  <span className="ml-2 text-xs font-medium text-stone-500">{formatDateTime(item.createdAt)}</span>
                </p>
                <p className="text-sm text-stone-700">{item.body}</p>
              </div>
            ))
          ) : (
            <p className="rounded-md bg-brand-muted px-3 py-3 text-sm text-stone-600">No comments yet.</p>
          )}
        </div>
      </section>
    </section>
  );
}
