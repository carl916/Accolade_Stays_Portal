"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek
} from "date-fns";
import { BedDouble, CalendarPlus, ChevronLeft, ChevronRight, Clock, Plus, Settings2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createCleaningJob } from "@/lib/admin/job-actions";
import {
  cleaningTypes,
  defaultGuestCheckInTime,
  formatBedConfiguration,
  getBedConfigurationAction,
  type BedConfiguration,
  type CleaningJobStatus,
  type CleaningType,
  type PhysicalBedType
} from "@/lib/domain/operations";
import { FormSubmitButton } from "./FormSubmitButton";
import { ModalSheet } from "./ModalSheet";

type PropertyOption = {
  id: string;
  name: string;
  defaultCleaningDurationMinutes: number;
  bedrooms: BedroomOption[];
};

type BedroomOption = {
  id: string;
  name: string;
  physicalBedType: PhysicalBedType;
  currentConfiguration: BedConfiguration;
  permittedConfigurations: BedConfiguration[];
};

type CleaningJobCalendarItem = {
  id: string;
  propertyId: string;
  propertyName: string;
  scheduledDate: string;
  cleaningType: CleaningType;
  status: CleaningJobStatus;
};

type JobsCalendarClientProps = {
  properties: PropertyOption[];
  jobs: CleaningJobCalendarItem[];
  initialError?: string;
  initialModal?: {
    isOpen: boolean;
    scheduledDate?: string;
    propertyId?: string;
  };
};

type AddCleanDraft = {
  scheduledDate: string;
  propertyId: string;
  propertyLocked: boolean;
};

const allPropertiesValue = "all";

const cleaningTypeLabels = {
  standard_changeover: "Standard changeover",
  mid_stay_clean: "Mid-stay clean",
  deep_or_remedial_clean: "Deep or remedial clean",
  other: "Other"
} satisfies Record<CleaningType, string>;

const statusLabels = {
  awaiting_approval: "Awaiting approval",
  awaiting_cleaner_response: "Awaiting cleaner response",
  accepted: "Accepted",
  in_progress: "In progress",
  completed: "Completed",
  requires_review: "Requires review",
  cancelled: "Cancelled"
} satisfies Record<CleaningJobStatus, string>;

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toDateInputValue(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function formatDurationCompact(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0 && remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${remainingMinutes}m`;
}

function formatCheckInTime(time: string) {
  const [hours = "16", minutes = "00"] = time.split(":");
  const date = new Date(2026, 0, 1, Number(hours), Number(minutes));

  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  })
    .format(date)
    .toLowerCase();
}

function getInitialRequiredConfigurations(property: PropertyOption | null) {
  const configurations: Record<string, BedConfiguration> = {};

  for (const bedroom of property?.bedrooms ?? []) {
    configurations[bedroom.id] = bedroom.permittedConfigurations.includes(bedroom.currentConfiguration)
      ? bedroom.currentConfiguration
      : bedroom.permittedConfigurations[0] ?? "unknown";
  }

  return configurations;
}

function getBedSetupSummary(property: PropertyOption | null) {
  if (!property) {
    return "Choose a property to load the bed setup.";
  }

  if (property.bedrooms.length === 0) {
    return "No active bedrooms have been configured.";
  }

  return property.bedrooms
    .map((bedroom) => `${bedroom.name}: ${formatBedConfiguration(bedroom.currentConfiguration)}`)
    .join(" - ");
}

export function JobsCalendarClient({ properties, jobs, initialError, initialModal }: JobsCalendarClientProps) {
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [propertyFilter, setPropertyFilter] = useState(initialModal?.propertyId ?? allPropertiesValue);
  const [addCleanDraft, setAddCleanDraft] = useState<AddCleanDraft | null>(() => {
    if (!initialModal?.isOpen) {
      return null;
    }

    const propertyId = initialModal.propertyId ?? "";

    return {
      scheduledDate: initialModal.scheduledDate ?? toDateInputValue(new Date()),
      propertyId,
      propertyLocked: Boolean(propertyId)
    };
  });
  const [requiredConfigurations, setRequiredConfigurations] = useState<Record<string, BedConfiguration>>({});
  const [showSetupControls, setShowSetupControls] = useState(false);
  const [showGuestOverride, setShowGuestOverride] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === addCleanDraft?.propertyId) ?? null,
    [addCleanDraft?.propertyId, properties]
  );

  useEffect(() => {
    setRequiredConfigurations(getInitialRequiredConfigurations(selectedProperty));
    setShowSetupControls(false);
    setShowGuestOverride(false);
  }, [selectedProperty]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 1 });

    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  const filteredJobs = useMemo(() => {
    if (propertyFilter === allPropertiesValue) {
      return jobs;
    }

    return jobs.filter((job) => job.propertyId === propertyFilter);
  }, [jobs, propertyFilter]);

  const jobsByDate = useMemo(() => {
    const grouped = new Map<string, CleaningJobCalendarItem[]>();

    for (const job of filteredJobs) {
      const existingJobs = grouped.get(job.scheduledDate) ?? [];
      grouped.set(job.scheduledDate, [...existingJobs, job]);
    }

    return grouped;
  }, [filteredJobs]);

  function openAddClean(scheduledDate = toDateInputValue(new Date())) {
    const lockedPropertyId = propertyFilter !== allPropertiesValue ? propertyFilter : "";

    setAddCleanDraft({
      scheduledDate,
      propertyId: lockedPropertyId,
      propertyLocked: Boolean(lockedPropertyId)
    });
  }

  function closeAddClean() {
    setAddCleanDraft(null);
    setShowSetupControls(false);
    setShowGuestOverride(false);
    setShowInstructions(false);
    setShowNotes(false);
  }

  function updateRequiredConfiguration(bedroomId: string, configuration: BedConfiguration) {
    setRequiredConfigurations((current) => ({
      ...current,
      [bedroomId]: configuration
    }));
  }

  const selectedPropertyHasBedrooms = (selectedProperty?.bedrooms.length ?? 0) > 0;

  return (
    <>
      <div className="grid gap-4 rounded-lg border border-brand-border bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center justify-between gap-2 sm:justify-start">
            <button
              type="button"
              onClick={() => setCalendarMonth((month) => addMonths(month, -1))}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-brand-border text-brand-ink transition hover:bg-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <h2 className="min-w-48 text-center text-xl font-semibold text-brand-ink">
              {format(calendarMonth, "MMMM yyyy")}
            </h2>
            <button
              type="button"
              onClick={() => setCalendarMonth((month) => addMonths(month, 1))}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-brand-border text-brand-ink transition hover:bg-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(14rem,1fr)_auto] sm:items-end">
            <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
              Property
              <select
                value={propertyFilter}
                onChange={(event) => setPropertyFilter(event.target.value)}
                className="min-h-11 rounded-md border border-brand-border bg-white px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
              >
                <option value={allPropertiesValue}>All properties</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => openAddClean()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-primary px-4 text-sm font-semibold text-brand-primaryForeground transition hover:bg-brand-primaryHover focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add clean
            </button>
          </div>
        </div>

        {initialError ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {initialError}
          </p>
        ) : null}

        <div className="hidden grid-cols-7 gap-px overflow-hidden rounded-lg border border-brand-border bg-brand-border sm:grid">
          {weekdayLabels.map((weekday) => (
            <div key={weekday} className="bg-brand-muted px-3 py-2 text-xs font-semibold uppercase text-brand-darkSlate">
              {weekday}
            </div>
          ))}
          {calendarDays.map((day) => {
            const dateValue = toDateInputValue(day);
            const dayJobs = jobsByDate.get(dateValue) ?? [];
            const isCurrentMonth = isSameMonth(day, calendarMonth);

            return (
              <div
                key={dateValue}
                className={`min-h-36 bg-white p-2 ${isCurrentMonth ? "" : "text-stone-400"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openAddClean(dateValue)}
                    className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md text-sm font-semibold transition hover:bg-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-1"
                    aria-label={`Add clean on ${format(day, "d MMMM yyyy")}`}
                  >
                    {format(day, "d")}
                  </button>
                  <button
                    type="button"
                    onClick={() => openAddClean(dateValue)}
                    className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md text-brand-darkSlate transition hover:bg-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-1"
                    aria-label={`Add clean on ${format(day, "d MMMM yyyy")}`}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-2 grid gap-1.5">
                  {dayJobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/admin/jobs/${job.id}`}
                      className="grid gap-0.5 rounded-md border border-brand-border bg-brand-muted px-2 py-1.5 text-left transition hover:border-brand-slate focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-1"
                    >
                      <span className="truncate text-xs font-semibold text-brand-ink">{job.propertyName}</span>
                      <span className="truncate text-xs text-stone-600">{cleaningTypeLabels[job.cleaningType]}</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-2 sm:hidden">
          {calendarDays
            .filter((day) => isSameMonth(day, calendarMonth))
            .map((day) => {
              const dateValue = toDateInputValue(day);
              const dayJobs = jobsByDate.get(dateValue) ?? [];

              return (
                <div key={dateValue} className="rounded-lg border border-brand-border bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => openAddClean(dateValue)}
                      className="text-left focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2"
                    >
                      <span className="block text-sm font-semibold text-brand-ink">{format(day, "EEE d MMM")}</span>
                      <span className="block text-xs text-stone-500">
                        {dayJobs.length === 0 ? "No cleans planned" : `${dayJobs.length} clean${dayJobs.length === 1 ? "" : "s"}`}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openAddClean(dateValue)}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-brand-border text-brand-darkSlate transition hover:bg-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2"
                      aria-label={`Add clean on ${format(day, "d MMMM yyyy")}`}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  {dayJobs.length > 0 ? (
                    <div className="mt-3 grid gap-2">
                      {dayJobs.map((job) => (
                        <Link
                          key={job.id}
                          href={`/admin/jobs/${job.id}`}
                          className="grid gap-1 rounded-md bg-brand-muted px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2"
                        >
                          <span className="text-sm font-semibold text-brand-ink">{job.propertyName}</span>
                          <span className="text-sm text-stone-600">{cleaningTypeLabels[job.cleaningType]}</span>
                          <span className="text-xs font-medium text-brand-darkSlate">{statusLabels[job.status]}</span>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
        </div>
      </div>

      <ModalSheet title="Add clean" isOpen={Boolean(addCleanDraft)} onClose={closeAddClean}>
        {addCleanDraft ? (
          <form action={createCleaningJob} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
                Cleaning date
                <input
                  name="scheduledDate"
                  type="date"
                  required
                  value={addCleanDraft.scheduledDate}
                  onChange={(event) =>
                    setAddCleanDraft((current) =>
                      current ? { ...current, scheduledDate: event.target.value } : current
                    )
                  }
                  className="min-h-11 rounded-md border border-brand-border px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
                />
              </label>

              {addCleanDraft.propertyLocked && selectedProperty ? (
                <div className="grid gap-1.5 text-sm font-medium text-brand-ink">
                  Property
                  <div className="flex min-h-11 items-center rounded-md border border-brand-border bg-brand-muted px-3 text-base">
                    {selectedProperty.name}
                  </div>
                  <input type="hidden" name="propertyId" value={selectedProperty.id} />
                </div>
              ) : (
                <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
                  Property
                  <select
                    name="propertyId"
                    required
                    value={addCleanDraft.propertyId}
                    onChange={(event) =>
                      setAddCleanDraft((current) =>
                        current ? { ...current, propertyId: event.target.value, propertyLocked: false } : current
                      )
                    }
                    className="min-h-11 rounded-md border border-brand-border bg-white px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
                  >
                    <option value="" disabled>
                      Choose property
                    </option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="grid gap-1.5 text-sm font-medium text-brand-ink sm:col-span-2">
                Cleaning type
                <select
                  name="cleaningType"
                  defaultValue="standard_changeover"
                  className="min-h-11 rounded-md border border-brand-border bg-white px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
                >
                  {cleaningTypes.map((type) => (
                    <option key={type} value={type}>
                      {cleaningTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 rounded-md border border-brand-border bg-brand-muted p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
                <Clock className="h-4 w-4 text-brand-darkSlate" aria-hidden="true" />
                Estimated clean:{" "}
                {selectedProperty ? formatDurationCompact(selectedProperty.defaultCleaningDurationMinutes) : "Choose property"}
              </div>
              <div className="grid gap-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
                  <BedDouble className="h-4 w-4 text-brand-darkSlate" aria-hidden="true" />
                  Bed setup
                </div>
                <p className="text-sm leading-6 text-stone-700">{getBedSetupSummary(selectedProperty)}</p>
              </div>
            </div>

            {selectedProperty?.bedrooms.map((bedroom) => (
              <input
                key={bedroom.id}
                type="hidden"
                name={`requiredConfiguration:${bedroom.id}`}
                value={requiredConfigurations[bedroom.id] ?? bedroom.currentConfiguration}
              />
            ))}

            <details className="rounded-md border border-brand-border bg-white" open={showSetupControls || showGuestOverride || showInstructions || showNotes}>
              <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm font-semibold text-brand-ink">
                <Settings2 className="h-4 w-4 text-brand-darkSlate" aria-hidden="true" />
                Advanced options
              </summary>
              <div className="grid gap-4 border-t border-brand-border p-3">
                <div className="grid gap-2">
                  <p className="text-sm font-semibold text-brand-ink">Guest arrival</p>
                  <p className="text-sm text-stone-600">
                    Default check-in: {formatCheckInTime(defaultGuestCheckInTime)}
                  </p>
                  <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-brand-ink">
                    <input
                      type="checkbox"
                      checked={showGuestOverride}
                      onChange={(event) => setShowGuestOverride(event.target.checked)}
                      className="h-5 w-5 rounded border-brand-border text-brand-primary focus:ring-brand-focus"
                    />
                    Early check-in / different deadline
                  </label>
                  {showGuestOverride ? (
                    <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
                      Guest arrival deadline
                      <input
                        name="guestArrivalDeadline"
                        type="datetime-local"
                        className="min-h-11 rounded-md border border-brand-border px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
                      />
                    </label>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-brand-ink">Bed configuration changes</p>
                      <p className="text-sm text-stone-600">Bedroom setup is snapshotted when the clean is created.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSetupControls((value) => !value)}
                      disabled={!selectedPropertyHasBedrooms}
                      className="inline-flex min-h-11 items-center justify-center rounded-md border border-brand-slate px-4 text-sm font-semibold text-brand-ink transition hover:bg-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {showSetupControls ? "Hide setup" : "Change setup"}
                    </button>
                  </div>
                  {!selectedPropertyHasBedrooms && selectedProperty ? (
                    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                      Add at least one active bedroom before creating a clean for this property.
                    </p>
                  ) : null}
                  {showSetupControls ? (
                    <div className="grid gap-2">
                      {selectedProperty?.bedrooms.map((bedroom) => {
                        const requiredConfiguration =
                          requiredConfigurations[bedroom.id] ?? bedroom.currentConfiguration;
                        const hasChanged = requiredConfiguration !== bedroom.currentConfiguration;

                        return (
                          <div key={bedroom.id} className="grid gap-2 rounded-md border border-brand-border p-3">
                            <div>
                              <p className="text-sm font-semibold text-brand-ink">{bedroom.name}</p>
                              <p className="text-sm text-stone-600">
                                {hasChanged
                                  ? `${formatBedConfiguration(bedroom.currentConfiguration)} -> ${formatBedConfiguration(requiredConfiguration)}`
                                  : `Current: ${formatBedConfiguration(bedroom.currentConfiguration)}`}
                              </p>
                            </div>
                            <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
                              Required setup
                              <select
                                value={requiredConfiguration}
                                onChange={(event) =>
                                  updateRequiredConfiguration(bedroom.id, event.target.value as BedConfiguration)
                                }
                                className="min-h-11 rounded-md border border-brand-border bg-white px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
                              >
                                {bedroom.permittedConfigurations.map((configuration) => (
                                  <option key={configuration} value={configuration}>
                                    {formatBedConfiguration(configuration)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <p className="rounded-md bg-brand-muted px-3 py-2 text-sm font-semibold text-brand-darkSlate">
                              Action:{" "}
                              {getBedConfigurationAction({
                                currentConfiguration: bedroom.currentConfiguration,
                                requiredConfiguration
                              })}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setShowInstructions((value) => !value)}
                    className="min-h-11 rounded-md border border-brand-slate px-4 text-sm font-semibold text-brand-ink transition hover:bg-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2"
                  >
                    {showInstructions ? "Hide cleaner instructions" : "Add cleaner instructions"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNotes((value) => !value)}
                    className="min-h-11 rounded-md border border-brand-slate px-4 text-sm font-semibold text-brand-ink transition hover:bg-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2"
                  >
                    {showNotes ? "Hide internal note" : "Add internal note"}
                  </button>
                </div>
                {showInstructions ? (
                  <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
                    Cleaner instructions
                    <textarea
                      name="instructions"
                      rows={3}
                      className="rounded-md border border-brand-border px-3 py-2 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
                    />
                  </label>
                ) : null}
                {showNotes ? (
                  <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
                    Internal note
                    <textarea
                      name="notes"
                      rows={3}
                      className="rounded-md border border-brand-border px-3 py-2 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
                    />
                  </label>
                ) : null}
              </div>
            </details>

            <div className="flex flex-col gap-2 border-t border-brand-border pt-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeAddClean}
                className="min-h-11 rounded-md border border-brand-slate px-4 text-sm font-semibold text-brand-ink transition hover:bg-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2"
              >
                Cancel
              </button>
              <FormSubmitButton disabled={!selectedPropertyHasBedrooms} pendingLabel="Creating clean...">
                <CalendarPlus className="mr-2 inline h-4 w-4" aria-hidden="true" />
                Create clean
              </FormSubmitButton>
            </div>
          </form>
        ) : null}
      </ModalSheet>
    </>
  );
}
