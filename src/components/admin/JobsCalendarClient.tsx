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
import {
  AlertTriangle,
  BedDouble,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListChecks,
  Mail,
  Plus,
  Settings2
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createCleaningJob } from "@/lib/admin/job-actions";
import { getCleanAddAffordanceVariant, type CleanAddAffordanceVariant } from "@/lib/calendar/clean-add-affordance";
import {
  addCalendarDays,
  buildStayCalendarWeeks,
  parseCalendarDate,
  toCalendarDateValue
} from "@/lib/calendar/stay-segments";
import {
  cleaningTypes,
  defaultGuestCheckInTime,
  formatBedConfiguration,
  getBedConfigurationAction,
  getCleaningJobStatusLabel,
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
  expectedStartTime: string | null;
  cleaningType: CleaningType;
  status: CleaningJobStatus;
  assignedResourceName: string | null;
  completedAt: string | null;
  requiresReview: boolean;
  bookingId: string | null;
  bookingChangeRequiresReview: boolean;
  bookingChangeReason: string | null;
};

type LinkedCleaningJob = {
  id: string;
  scheduledDate: string;
  status: CleaningJobStatus;
  cleaningType: CleaningType;
  bookingChangeRequiresReview: boolean;
  bookingChangeReason: string | null;
};

type BookingCalendarItem = {
  id: string;
  propertyId: string;
  propertyName: string;
  smoobuReservationId: number;
  smoobuReferenceId: string | null;
  smoobuApartmentName: string;
  channelName: string | null;
  bookingType: string;
  arrivalDate: string;
  departureDate: string;
  previousArrivalDate: string | null;
  previousDepartureDate: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  adults: number | null;
  children: number | null;
  guestLanguage: string | null;
  guestId: number | null;
  guestAppUrl: string | null;
  notice: string | null;
  cleanReviewRequired: boolean;
  cleanReviewReason: string | null;
  lastSyncedAt: string | null;
  messagesNeedRefresh: boolean;
  linkedJobs: LinkedCleaningJob[];
};

type DisplayMessage = {
  id: number;
  subject: string;
  body: string;
  direction: "incoming" | "outgoing";
};

type JobsCalendarClientProps = {
  properties: PropertyOption[];
  jobs: CleaningJobCalendarItem[];
  bookings: BookingCalendarItem[];
  initialError?: string;
  canCreateManualClean: boolean;
  jobDetailBasePath: "/admin/jobs" | "/manager/jobs";
  initialModal?: {
    isOpen: boolean;
    scheduledDate?: string;
    propertyId?: string;
    propertyLocked?: boolean;
    bookingId?: string;
  };
};

type AddCleanDraft = {
  scheduledDate: string;
  propertyId: string;
  propertyLocked: boolean;
  bookingId?: string;
  expectedStartTime?: string | null;
  guestArrivalDeadline?: string | null;
  departingGuestName?: string;
  departingCheckout?: string | null;
  nextGuestName?: string | null;
  nextCheckIn?: string | null;
};

type CalendarView = "month" | "agenda";

const allPropertiesValue = "all";

const cleaningTypeLabels = {
  standard_changeover: "Standard changeover",
  mid_stay_clean: "Mid-stay clean",
  deep_or_remedial_clean: "Deep or remedial clean",
  other: "Other"
} satisfies Record<CleaningType, string>;

const statusLabels = {
  awaiting_approval: "Needs review",
  awaiting_cleaner_response: "Confirmed",
  accepted: "Accepted",
  in_progress: "In progress",
  completed: "Completed",
  requires_review: "Requires review",
  cancelled: "Cancelled"
} satisfies Record<CleaningJobStatus, string>;

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const propertyTonePalette = [
  { accent: "#3f516d", background: "#eef2f7", text: "#1f2937" },
  { accent: "#4f6f52", background: "#edf5ee", text: "#1f3324" },
  { accent: "#8a5a44", background: "#f6eee9", text: "#3b261e" },
  { accent: "#6a5f8f", background: "#f1eff7", text: "#2f2940" },
  { accent: "#2f6f73", background: "#eaf5f5", text: "#1d3638" }
];
const calendarDateGridTemplate = "7rem repeat(7, minmax(0, 1fr))";
const calendarHalfDayGridTemplate = "7rem repeat(14, minmax(0, 1fr))";

function toDateInputValue(date: Date) {
  return toCalendarDateValue(date);
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

function getGuestDisplayName(name: string) {
  return name.trim() || "Guest";
}

function formatTime(time: string | null | undefined, fallback = "Not set") {
  return time ? time.slice(0, 5) : fallback;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(parseCalendarDate(value));
}

function formatDateHeading(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(parseCalendarDate(value));
}

function formatAgendaGroupHeading(value: string, todayValue: string) {
  const tomorrowValue = toDateInputValue(addCalendarDays(parseCalendarDate(todayValue), 1));

  if (value === todayValue) {
    return "Today";
  }

  if (value === tomorrowValue) {
    return "Tomorrow";
  }

  return formatDateHeading(value);
}

function formatDateTimeClock(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not synced yet";
  }

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

function toDateTimeLocal(date: string, time: string | null | undefined) {
  return time ? `${date}T${time.slice(0, 5)}` : "";
}

function groupByDate<T>(items: T[], getDate: (item: T) => string) {
  const grouped = new Map<string, T[]>();

  for (const item of items) {
    const date = getDate(item);
    grouped.set(date, [...(grouped.get(date) ?? []), item]);
  }

  return grouped;
}

function getCleaningChipText(job: CleaningJobCalendarItem) {
  if (job.status === "requires_review" || job.requiresReview || job.bookingChangeRequiresReview) {
    return "Clean - Issue reported";
  }

  if (job.status === "in_progress") {
    return "Clean - In progress";
  }

  if (job.status === "completed") {
    const completedAt = formatDateTimeClock(job.completedAt);
    return completedAt ? `Completed ${completedAt}` : "Completed";
  }

  if (job.status === "awaiting_approval") {
    return "Needs review";
  }

  if (job.status === "awaiting_cleaner_response") {
    return job.assignedResourceName ?? "Confirmed - Unassigned";
  }

  if (job.assignedResourceName) {
    return job.assignedResourceName;
  }

  return "Unassigned";
}

function getCleaningChipClasses(job: CleaningJobCalendarItem) {
  if (job.status === "cancelled") {
    return "border-stone-200 bg-stone-50 text-stone-500";
  }

  if (job.status === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (job.status === "requires_review" || job.requiresReview || job.bookingChangeRequiresReview) {
    return "border-amber-300 bg-amber-50 text-amber-900";
  }

  if (job.status === "in_progress") {
    return "border-brand-slate bg-brand-light text-brand-ink";
  }

  if (!job.assignedResourceName) {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-brand-border bg-brand-muted text-brand-ink";
}

function getCleaningChipIcon(job: CleaningJobCalendarItem) {
  if (job.status === "completed") {
    return <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }

  if (job.status === "requires_review" || job.requiresReview || job.bookingChangeRequiresReview || !job.assignedResourceName) {
    return <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
  }

  return <ListChecks className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
}

export function JobsCalendarClient({
  properties,
  jobs,
  bookings,
  initialError,
  canCreateManualClean,
  jobDetailBasePath,
  initialModal
}: JobsCalendarClientProps) {
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [propertyFilter, setPropertyFilter] = useState(allPropertiesValue);
  const [addCleanDraft, setAddCleanDraft] = useState<AddCleanDraft | null>(() => {
    if (!initialModal?.isOpen) {
      return null;
    }

    const propertyId = initialModal.propertyId ?? "";
    const booking = bookings.find((item) => item.id === initialModal.bookingId);

    return {
      scheduledDate: initialModal.scheduledDate ?? booking?.departureDate ?? toDateInputValue(new Date()),
      propertyId: propertyId || booking?.propertyId || "",
      propertyLocked: Boolean(initialModal.propertyLocked && propertyId),
      bookingId: booking?.id,
      expectedStartTime: booking?.checkOutTime,
      departingGuestName: booking?.guestName,
      departingCheckout: booking?.checkOutTime
    };
  });
  const [selectedBooking, setSelectedBooking] = useState<BookingCalendarItem | null>(null);
  const [activeCleanAddDate, setActiveCleanAddDate] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [requiredConfigurations, setRequiredConfigurations] = useState<Record<string, BedConfiguration>>({});
  const [editingBedroomIds, setEditingBedroomIds] = useState<string[]>([]);
  const [showGuestOverride, setShowGuestOverride] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === addCleanDraft?.propertyId) ?? null,
    [addCleanDraft?.propertyId, properties]
  );

  useEffect(() => {
    setRequiredConfigurations(getInitialRequiredConfigurations(selectedProperty));
    setEditingBedroomIds([]);
    setShowGuestOverride(false);
  }, [selectedProperty]);

  useEffect(() => {
    if (!activeCleanAddDate) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Element | null;

      if (!target?.closest("[data-clean-add-cell='true']")) {
        setActiveCleanAddDate(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [activeCleanAddDate]);

  useEffect(() => {
    setActiveCleanAddDate(null);
  }, [calendarMonth, calendarView, propertyFilter]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 1 });

    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  const calendarWeeks = useMemo(() => {
    const weeks: Date[][] = [];

    for (let index = 0; index < calendarDays.length; index += 7) {
      weeks.push(calendarDays.slice(index, index + 7));
    }

    return weeks;
  }, [calendarDays]);

  const filteredJobs = useMemo(() => {
    if (propertyFilter === allPropertiesValue) {
      return jobs;
    }

    return jobs.filter((job) => job.propertyId === propertyFilter);
  }, [jobs, propertyFilter]);

  const filteredBookings = useMemo(() => {
    if (propertyFilter === allPropertiesValue) {
      return bookings;
    }

    return bookings.filter((booking) => booking.propertyId === propertyFilter);
  }, [bookings, propertyFilter]);

  const visibleLaneProperties = useMemo(() => {
    if (propertyFilter === allPropertiesValue) {
      return properties;
    }

    return properties.filter((property) => property.id === propertyFilter);
  }, [properties, propertyFilter]);

  const bookingsById = useMemo(() => new Map(bookings.map((booking) => [booking.id, booking])), [bookings]);

  const propertyTonesById = useMemo(
    () =>
      new Map(
        properties.map((property, index) => [
          property.id,
          propertyTonePalette[index % propertyTonePalette.length]
        ])
      ),
    [properties]
  );

  const jobsByDate = useMemo(
    () =>
      groupByDate(
        [...filteredJobs].sort((left, right) =>
          `${left.scheduledDate} ${formatTime(left.expectedStartTime, "99:99")} ${left.propertyName}`.localeCompare(
            `${right.scheduledDate} ${formatTime(right.expectedStartTime, "99:99")} ${right.propertyName}`
          )
        ),
        (job) => job.scheduledDate
      ),
    [filteredJobs]
  );

  const occupancyByDate = useMemo(() => {
    const grouped = new Map<string, BookingCalendarItem[]>();
    const visibleStart = calendarDays[0] ? parseCalendarDate(toDateInputValue(calendarDays[0])) : null;
    const visibleEndExclusive = calendarDays[calendarDays.length - 1]
      ? addCalendarDays(parseCalendarDate(toDateInputValue(calendarDays[calendarDays.length - 1])), 1)
      : null;

    if (!visibleStart || !visibleEndExclusive) {
      return grouped;
    }

    for (const booking of filteredBookings) {
      const bookingStart = parseCalendarDate(booking.arrivalDate);
      const bookingEndExclusive = parseCalendarDate(booking.departureDate);
      let cursor = bookingStart > visibleStart ? bookingStart : visibleStart;
      const end = bookingEndExclusive < visibleEndExclusive ? bookingEndExclusive : visibleEndExclusive;

      while (cursor < end) {
        const dateValue = toDateInputValue(cursor);
        grouped.set(dateValue, [...(grouped.get(dateValue) ?? []), booking]);
        cursor = addCalendarDays(cursor, 1);
      }
    }

    return grouped;
  }, [calendarDays, filteredBookings]);

  const stayWeeksByStart = useMemo(() => {
    const stayWeeks = buildStayCalendarWeeks({
      bookings: filteredBookings,
      weekStarts: calendarWeeks.map((week) => toDateInputValue(week[0]))
    });

    return new Map(stayWeeks.map((week) => [week.weekStart, week]));
  }, [calendarWeeks, filteredBookings]);

  const todayValue = toDateInputValue(new Date());

  const agendaDateGroups = useMemo(() => {
    const monthStartValue = toDateInputValue(startOfMonth(calendarMonth));
    const monthEndValue = toDateInputValue(endOfMonth(calendarMonth));
    const monthJobs = filteredJobs
      .filter(
        (job) =>
          job.status !== "cancelled" &&
          job.scheduledDate >= monthStartValue &&
          job.scheduledDate <= monthEndValue
      )
      .sort((left, right) =>
        `${left.scheduledDate} ${formatTime(left.expectedStartTime, "99:99")} ${left.propertyName}`.localeCompare(
          `${right.scheduledDate} ${formatTime(right.expectedStartTime, "99:99")} ${right.propertyName}`
        )
      );

    return [...groupByDate(monthJobs, (job) => job.scheduledDate).entries()];
  }, [calendarMonth, filteredJobs]);

  function getNextArrivalForBooking(booking: BookingCalendarItem) {
    return bookings
      .filter(
        (candidate) =>
          candidate.id !== booking.id &&
          candidate.propertyId === booking.propertyId &&
          candidate.arrivalDate === booking.departureDate
      )
      .sort((left, right) => formatTime(left.checkInTime, "23:59").localeCompare(formatTime(right.checkInTime, "23:59")))[0];
  }

  async function loadMessages(bookingId: string) {
    setIsLoadingMessages(true);
    setMessagesError(null);

    try {
      const response = await fetch(`/api/smoobu/bookings/${bookingId}/messages`);
      const payload = (await response.json()) as { ok: boolean; messages?: DisplayMessage[]; error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Messages could not be loaded.");
      }

      setMessages(payload.messages ?? []);
    } catch (error) {
      setMessages([]);
      setMessagesError(error instanceof Error ? error.message : "Messages could not be loaded.");
    } finally {
      setIsLoadingMessages(false);
    }
  }

  function openBooking(booking: BookingCalendarItem) {
    setSelectedBooking(booking);
    setMessages([]);
    void loadMessages(booking.id);
  }

  function openAddClean(scheduledDate = toDateInputValue(new Date()), booking?: BookingCalendarItem) {
    const lockedPropertyId = propertyFilter !== allPropertiesValue ? propertyFilter : "";
    const nextArrival = booking ? getNextArrivalForBooking(booking) : null;

    setAddCleanDraft({
      scheduledDate: booking?.departureDate ?? scheduledDate,
      propertyId: booking?.propertyId ?? lockedPropertyId,
      propertyLocked: Boolean(booking || lockedPropertyId),
      bookingId: booking?.id,
      expectedStartTime: booking?.checkOutTime,
      guestArrivalDeadline: nextArrival ? toDateTimeLocal(nextArrival.arrivalDate, nextArrival.checkInTime) : null,
      departingGuestName: booking?.guestName,
      departingCheckout: booking?.checkOutTime,
      nextGuestName: nextArrival?.guestName ?? null,
      nextCheckIn: nextArrival?.checkInTime ?? null
    });
    setSelectedBooking(null);
  }

  function closeAddClean() {
    setAddCleanDraft(null);
    setEditingBedroomIds([]);
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

  function toggleBedroomSetupEditor(bedroomId: string) {
    setEditingBedroomIds((current) =>
      current.includes(bedroomId) ? current.filter((id) => id !== bedroomId) : [...current, bedroomId]
    );
  }

  function resetBedroomSetupChange(bedroom: BedroomOption) {
    updateRequiredConfiguration(bedroom.id, bedroom.currentConfiguration);
    setEditingBedroomIds((current) => current.filter((id) => id !== bedroom.id));
  }

  const selectedPropertyHasBedrooms = (selectedProperty?.bedrooms.length ?? 0) > 0;

  function revealCleanAddDate(dateValue: string) {
    if (canCreateManualClean) {
      setActiveCleanAddDate(dateValue);
    }
  }

  function hideCleanAddDate(dateValue: string) {
    setActiveCleanAddDate((current) => (current === dateValue ? null : current));
  }

  function openAddCleanForDate(dateValue: string) {
    openAddClean(dateValue);
    setActiveCleanAddDate(null);
  }

  function renderCleanAddAffordance(args: {
    dateValue: string;
    day: Date;
    variant: CleanAddAffordanceVariant;
  }) {
    if (!canCreateManualClean) {
      return null;
    }

    const isActive = activeCleanAddDate === args.dateValue;
    const visibilityClass = isActive
      ? "pointer-events-auto opacity-100"
      : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100";
    const label = `Add clean for ${format(args.day, "d MMMM")}`;

    if (args.variant === "compact") {
      return (
        <button
          type="button"
          tabIndex={isActive ? 0 : -1}
          onClick={(event) => {
            event.stopPropagation();
            openAddCleanForDate(args.dateValue);
          }}
          aria-label={label}
          className={`absolute right-1.5 top-1.5 z-20 inline-flex h-8 w-8 items-center justify-center rounded-md border border-brand-slate bg-white text-brand-primary shadow-sm transition hover:bg-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-1 ${visibilityClass}`}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      );
    }

    return (
      <button
        type="button"
        tabIndex={isActive ? 0 : -1}
        onClick={(event) => {
          event.stopPropagation();
          openAddCleanForDate(args.dateValue);
        }}
        aria-label={label}
        className={`absolute bottom-1.5 left-1.5 right-1.5 z-20 flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-dashed border-brand-slate bg-white/90 px-2 text-xs font-semibold text-brand-primary shadow-sm transition hover:bg-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-1 ${visibilityClass}`}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Add clean
      </button>
    );
  }

  function renderCleaningChip(job: CleaningJobCalendarItem, size: "compact" | "regular" = "compact") {
    return (
      <Link
        key={job.id}
        href={`${jobDetailBasePath}/${job.id}`}
        className={`grid min-w-0 gap-0.5 rounded-md border px-2 text-left shadow-sm transition hover:shadow focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-1 ${
          size === "regular" ? "py-2" : "py-1.5"
        } ${getCleaningChipClasses(job)}`}
      >
        <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold">
          {getCleaningChipIcon(job)}
          <span className="truncate">{getCleaningChipText(job)}</span>
        </span>
        <span className="truncate text-[0.68rem] font-medium opacity-80">
          {job.propertyName}
          {job.expectedStartTime
            ? ` - ${formatTime(job.expectedStartTime)}`
            : ` - ${getCleaningJobStatusLabel({
                status: job.status,
                assignedResourceName: job.assignedResourceName,
                requiresReview: job.requiresReview,
                bookingChangeRequiresReview: job.bookingChangeRequiresReview
              })}`}
        </span>
      </Link>
    );
  }

  function renderAgendaJobCard(job: CleaningJobCalendarItem) {
    return (
      <Link
        key={job.id}
        href={`${jobDetailBasePath}/${job.id}`}
        className={`grid gap-2 rounded-md border p-3 text-left shadow-sm transition hover:shadow focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-1 ${getCleaningChipClasses(
          job
        )}`}
      >
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          {getCleaningChipIcon(job)}
          <span className="truncate">{job.propertyName}</span>
        </span>
        <span className="text-xs font-medium opacity-90">
          {cleaningTypeLabels[job.cleaningType]} - {formatTime(job.expectedStartTime, "Time not set")}
        </span>
        <span className="text-xs opacity-80">
          {getCleaningJobStatusLabel({
            status: job.status,
            assignedResourceName: job.assignedResourceName,
            requiresReview: job.requiresReview,
            bookingChangeRequiresReview: job.bookingChangeRequiresReview
          })}
        </span>
      </Link>
    );
  }

  function getBookingTooltip(booking: BookingCalendarItem) {
    return [
      getGuestDisplayName(booking.guestName),
      booking.propertyName,
      `Check-in: ${formatDate(booking.arrivalDate)}${booking.checkInTime ? ` ${formatTime(booking.checkInTime)}` : ""}`,
      `Check-out: ${formatDate(booking.departureDate)}${booking.checkOutTime ? ` ${formatTime(booking.checkOutTime)}` : ""}`,
      `Channel: ${booking.channelName ?? "Unknown"}`
    ].join("\n");
  }

  return (
    <>
      <div className="grid gap-4 rounded-lg border border-brand-border bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
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
            <button
              type="button"
              onClick={() => setCalendarMonth(startOfMonth(new Date()))}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-brand-border px-3 text-sm font-semibold text-brand-ink transition hover:bg-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2"
            >
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Today
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-end">
            <div className="grid gap-1.5 text-sm font-medium text-brand-ink">
              View
              <div className="inline-grid min-h-11 grid-cols-2 overflow-hidden rounded-md border border-brand-border bg-white">
                {(["month", "agenda"] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setCalendarView(view)}
                    aria-pressed={calendarView === view}
                    className={`px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-1 ${
                      calendarView === view
                        ? "bg-brand-primary text-brand-primaryForeground"
                        : "text-stone-700 hover:bg-brand-muted"
                    }`}
                  >
                    {view === "month" ? "Month" : "Agenda"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-1.5 text-sm font-medium text-brand-ink">
              Property
              <div className="hidden min-h-11 flex-wrap items-center gap-1 rounded-md border border-brand-border bg-white p-1 md:flex">
                {[{ id: allPropertiesValue, name: "All" }, ...properties].map((property) => (
                  <button
                    key={property.id}
                    type="button"
                    onClick={() => setPropertyFilter(property.id)}
                    aria-pressed={propertyFilter === property.id}
                    className={`min-h-9 rounded px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-1 ${
                      propertyFilter === property.id
                        ? "bg-brand-primary text-brand-primaryForeground"
                        : "text-stone-700 hover:bg-brand-muted"
                    }`}
                  >
                    <span className="block max-w-32 truncate">{property.name}</span>
                  </button>
                ))}
              </div>
              <select
                value={propertyFilter}
                onChange={(event) => setPropertyFilter(event.target.value)}
                className="min-h-11 rounded-md border border-brand-border bg-white px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30 md:hidden"
              >
                <option value={allPropertiesValue}>All properties</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>
            {canCreateManualClean ? (
              <button
                type="button"
                onClick={() => openAddClean()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-primary px-4 text-sm font-semibold text-brand-primaryForeground transition hover:bg-brand-primaryHover focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add clean
              </button>
            ) : null}
          </div>
        </div>

        {initialError ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {initialError}
          </p>
        ) : null}

        {calendarView === "month" ? (
          <>
            <div className="hidden overflow-hidden rounded-lg border border-brand-border bg-white sm:block">
              <div
                className="grid border-b border-brand-border bg-brand-muted"
                style={{ gridTemplateColumns: calendarDateGridTemplate }}
              >
                <div className="border-r border-brand-border px-3 py-2 text-xs font-semibold uppercase text-brand-darkSlate">
                  Property
                </div>
                {weekdayLabels.map((weekday) => (
                  <div key={weekday} className="px-3 py-2 text-xs font-semibold uppercase text-brand-darkSlate">
                    {weekday}
                  </div>
                ))}
              </div>
              <div className="grid gap-2 bg-brand-muted/70">
                {calendarWeeks.map((week, weekIndex) => {
                  const weekStartValue = toDateInputValue(week[0]);
                  const stayWeek = stayWeeksByStart.get(weekStartValue);
                  const weekHasJobs = week.some((day) => (jobsByDate.get(toDateInputValue(day)) ?? []).length > 0);
                  const weekMaxCleanCount = Math.max(
                    0,
                    ...week.map((day) => (jobsByDate.get(toDateInputValue(day)) ?? []).length)
                  );
                  const shouldShowCleanRow = weekHasJobs || canCreateManualClean;

                  return (
                    <div
                      key={weekStartValue}
                      className={`relative overflow-hidden bg-white ${
                        weekIndex > 0 ? "border-t-2 border-brand-slate/30" : ""
                      }`}
                    >
                      <div
                        className="pointer-events-none absolute inset-0 grid divide-x divide-brand-border"
                        style={{ gridTemplateColumns: calendarDateGridTemplate }}
                      >
                        <div className="bg-brand-muted/40" />
                        {week.map((day) => {
                          const dateValue = toDateInputValue(day);
                          const isCurrentMonth = isSameMonth(day, calendarMonth);

                          return (
                            <div
                              key={dateValue}
                              className={`${isCurrentMonth ? "bg-white/80" : "bg-brand-muted/50"} ${
                                dateValue === todayValue ? "bg-brand-light/30" : ""
                              }`}
                            />
                          );
                        })}
                      </div>

                      <div
                        className="relative grid border-b border-brand-border/70"
                        style={{ gridTemplateColumns: calendarDateGridTemplate }}
                      >
                        <div className="border-r border-brand-border bg-white/80 px-3 py-1 text-[0.65rem] font-semibold uppercase text-stone-500">
                          Week
                        </div>
                        {week.map((day) => {
                          const dateValue = toDateInputValue(day);
                          const isCurrentMonth = isSameMonth(day, calendarMonth);

                          return (
                            <button
                              key={dateValue}
                              type="button"
                              onClick={() => {
                                if (canCreateManualClean) {
                                  openAddClean(dateValue);
                                }
                              }}
                              className={`min-h-9 px-2 py-1 text-left text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-inset ${
                                isCurrentMonth ? "text-brand-ink" : "text-stone-400"
                              } ${canCreateManualClean ? "hover:bg-brand-muted" : "cursor-default"}`}
                              aria-label={
                                canCreateManualClean
                                  ? `Add clean on ${format(day, "d MMMM yyyy")}`
                                  : format(day, "d MMMM yyyy")
                              }
                            >
                              <span
                                className={`inline-flex min-h-7 min-w-7 items-center justify-center rounded-md ${
                                  dateValue === todayValue ? "bg-brand-primary text-brand-primaryForeground" : ""
                                }`}
                              >
                                {format(day, "d")}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="relative py-1.5">
                        {visibleLaneProperties.length > 0 ? (
                          visibleLaneProperties.map((property) => {
                            const tone = propertyTonesById.get(property.id) ?? propertyTonePalette[0];
                            const propertySegments = (stayWeek?.segments ?? []).filter(
                              (segment) => segment.propertyId === property.id
                            );

                            return (
                              <div
                                key={property.id}
                                className="relative grid min-h-9 items-center"
                                style={{ gridTemplateColumns: calendarHalfDayGridTemplate }}
                              >
                                <div className="relative z-10 flex min-h-9 min-w-0 items-center gap-2 border-r border-brand-border bg-white/90 px-3">
                                  <span
                                    className="h-2 w-2 shrink-0 rounded-full"
                                    style={{ backgroundColor: tone.accent }}
                                    aria-hidden="true"
                                  />
                                  <span className="truncate text-xs font-semibold text-stone-600" title={property.name}>
                                    {property.name}
                                  </span>
                                </div>
                                {propertySegments.map((segment) => {
                                  const booking = bookingsById.get(segment.bookingId);

                                  if (!booking) {
                                    return null;
                                  }

                                  return (
                                    <button
                                      key={`${segment.bookingId}-${segment.weekStart}-${segment.startHalfColumn}`}
                                      type="button"
                                      onClick={() => openBooking(booking)}
                                      title={getBookingTooltip(booking)}
                                      className={`z-10 my-0.5 flex min-h-7 min-w-0 items-center border px-2 text-left text-xs font-semibold shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-1 ${
                                        segment.startsAtBookingStart ? "rounded-l-md border-l-4" : "rounded-l-none border-l"
                                      } ${segment.endsAtBookingEnd ? "rounded-r-md" : "rounded-r-none"}`}
                                      style={{
                                        gridColumn: `${segment.startHalfColumn + 1} / ${segment.endHalfColumn + 1}`,
                                        backgroundColor: tone.background,
                                        borderColor: tone.accent,
                                        color: tone.text
                                      }}
                                    >
                                      <span className="truncate">{getGuestDisplayName(booking.guestName)}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })
                        ) : (
                          <div
                            className="relative grid min-h-9 items-center"
                            style={{ gridTemplateColumns: calendarHalfDayGridTemplate }}
                          >
                            <div className="border-r border-brand-border bg-white/90 px-3 py-2 text-xs font-semibold text-stone-500">
                              No properties
                            </div>
                          </div>
                        )}
                      </div>

                      {shouldShowCleanRow ? (
                        <div
                          className="relative grid border-t border-brand-border/70 bg-white/90"
                          style={{ gridTemplateColumns: calendarHalfDayGridTemplate }}
                        >
                          <div className="border-r border-brand-border px-3 py-2 text-[0.65rem] font-semibold uppercase text-stone-500">
                            Cleans
                          </div>
                          {week.map((day, index) => {
                            const dateValue = toDateInputValue(day);
                            const dayJobs = jobsByDate.get(dateValue) ?? [];
                            const addAffordanceVariant = getCleanAddAffordanceVariant({
                              dayCleanCount: dayJobs.length,
                              weekMaxCleanCount
                            });

                            return (
                              <div
                                key={dateValue}
                                data-clean-add-cell="true"
                                tabIndex={canCreateManualClean ? 0 : undefined}
                                onPointerEnter={(event) => {
                                  if (event.pointerType === "mouse") {
                                    revealCleanAddDate(dateValue);
                                  }
                                }}
                                onPointerLeave={(event) => {
                                  if (event.pointerType === "mouse") {
                                    hideCleanAddDate(dateValue);
                                  }
                                }}
                                onFocus={() => revealCleanAddDate(dateValue)}
                                onBlur={(event) => {
                                  if (!event.currentTarget.contains(event.relatedTarget)) {
                                    hideCleanAddDate(dateValue);
                                  }
                                }}
                                onClick={(event) => {
                                  if ((event.target as HTMLElement).closest("a,button")) {
                                    return;
                                  }

                                  revealCleanAddDate(dateValue);
                                }}
                                onKeyDown={(event) => {
                                  if (event.target !== event.currentTarget) {
                                    return;
                                  }

                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();

                                    if (activeCleanAddDate === dateValue) {
                                      openAddCleanForDate(dateValue);
                                    } else {
                                      revealCleanAddDate(dateValue);
                                    }
                                  }
                                }}
                                className={`group relative grid min-h-12 gap-1 p-1.5 focus:outline-none ${
                                  canCreateManualClean ? "cursor-pointer focus:ring-2 focus:ring-brand-focus focus:ring-inset" : ""
                                }`}
                                style={{ gridColumn: `${index * 2 + 2} / span 2` }}
                              >
                                {dayJobs.map((job) => renderCleaningChip(job))}
                                {renderCleanAddAffordance({
                                  dateValue,
                                  day,
                                  variant: addAffordanceVariant
                                })}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-2 sm:hidden">
              {calendarDays
                .filter((day) => isSameMonth(day, calendarMonth))
                .map((day) => {
                  const dateValue = toDateInputValue(day);
                  const dayJobs = jobsByDate.get(dateValue) ?? [];
                  const dayBookings = (occupancyByDate.get(dateValue) ?? []).filter(
                    (booking) => booking.arrivalDate === dateValue || booking.departureDate === dateValue
                  );
                  const addAffordanceVariant = getCleanAddAffordanceVariant({
                    dayCleanCount: dayJobs.length,
                    weekMaxCleanCount: dayJobs.length
                  });

                  return (
                    <div key={dateValue} className="rounded-lg border border-brand-border bg-white p-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (canCreateManualClean) {
                            revealCleanAddDate(dateValue);
                          }
                        }}
                        className={`text-left focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2 ${
                          canCreateManualClean ? "" : "cursor-default"
                        }`}
                      >
                        <span className="block text-sm font-semibold text-brand-ink">{format(day, "EEE d MMM")}</span>
                        <span className="block text-xs text-stone-500">
                          {dayJobs.length === 0 && dayBookings.length === 0
                            ? "No cleans or changeovers"
                            : `${dayJobs.length} clean${dayJobs.length === 1 ? "" : "s"}, ${dayBookings.length} changeover${
                                dayBookings.length === 1 ? "" : "s"
                              }`}
                        </span>
                      </button>

                      {dayBookings.length > 0 ? (
                        <div className="mt-3 grid gap-2">
                          {dayBookings.map((booking) => {
                            const tone = propertyTonesById.get(booking.propertyId) ?? propertyTonePalette[0];

                            return (
                              <button
                                key={`${booking.id}-${dateValue}`}
                                type="button"
                                onClick={() => openBooking(booking)}
                                title={getBookingTooltip(booking)}
                                className="min-h-9 truncate rounded-md border px-3 py-2 text-left text-sm font-semibold"
                                style={{
                                  backgroundColor: tone.background,
                                  borderColor: tone.accent,
                                  color: tone.text
                                }}
                              >
                                {getGuestDisplayName(booking.guestName)}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}

                      {dayJobs.length > 0 || canCreateManualClean ? (
                        <div
                          data-clean-add-cell="true"
                          tabIndex={canCreateManualClean ? 0 : undefined}
                          onFocus={() => revealCleanAddDate(dateValue)}
                          onBlur={(event) => {
                            if (!event.currentTarget.contains(event.relatedTarget)) {
                              hideCleanAddDate(dateValue);
                            }
                          }}
                          onClick={(event) => {
                            if ((event.target as HTMLElement).closest("a,button")) {
                              return;
                            }

                            revealCleanAddDate(dateValue);
                          }}
                          onKeyDown={(event) => {
                            if (event.target !== event.currentTarget) {
                              return;
                            }

                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();

                              if (activeCleanAddDate === dateValue) {
                                openAddCleanForDate(dateValue);
                              } else {
                                revealCleanAddDate(dateValue);
                              }
                            }
                          }}
                          className={`group relative mt-3 grid min-h-12 gap-2 rounded-md border border-transparent focus:outline-none ${
                            canCreateManualClean ? "cursor-pointer focus:ring-2 focus:ring-brand-focus focus:ring-inset" : ""
                          }`}
                        >
                          {dayJobs.map((job) => renderCleaningChip(job, "regular"))}
                          {renderCleanAddAffordance({
                            dateValue,
                            day,
                            variant: addAffordanceVariant
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
            </div>
          </>
        ) : (
          <div className="grid gap-4">
            {agendaDateGroups.length > 0 ? (
              agendaDateGroups.map(([dateValue, dateJobs]) => {
                const heading = formatAgendaGroupHeading(dateValue, todayValue);

                return (
                  <section
                    key={dateValue}
                    className="grid gap-2 border-b border-brand-border pb-4 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <h3 className="text-sm font-semibold text-brand-ink">{heading}</h3>
                      <p className="text-xs text-stone-500">
                        {heading === formatDateHeading(dateValue) ? "" : `${formatDateHeading(dateValue)} - `}
                        {dateJobs.length} clean{dateJobs.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {dateJobs.map((job) => renderAgendaJobCard(job))}
                    </div>
                  </section>
                );
              })
            ) : (
              <div className="rounded-md border border-brand-border bg-brand-muted px-3 py-3">
                <p className="text-sm font-semibold text-brand-ink">No cleaning jobs in {format(calendarMonth, "MMMM yyyy")}</p>
                <p className="mt-1 text-sm text-stone-600">
                  The current property filter has no scheduled cleans in this month.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <ModalSheet title="Add clean" isOpen={Boolean(addCleanDraft)} onClose={closeAddClean}>
        {addCleanDraft ? (
          <form action={createCleaningJob} className="grid gap-4">
            {addCleanDraft.bookingId ? <input type="hidden" name="bookingId" value={addCleanDraft.bookingId} /> : null}
            {addCleanDraft.expectedStartTime ? (
              <input type="hidden" name="expectedStartTime" value={addCleanDraft.expectedStartTime} />
            ) : null}
            {addCleanDraft.guestArrivalDeadline ? (
              <input type="hidden" name="guestArrivalDeadline" value={addCleanDraft.guestArrivalDeadline} />
            ) : null}
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
                  <input type="hidden" name="propertyLocked" value="1" />
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
              {addCleanDraft.bookingId ? (
                <div className="grid gap-1 rounded-md bg-white px-3 py-2 text-sm text-stone-700">
                  <p className="font-semibold text-brand-ink">Booking changeover</p>
                  <p>
                    Departing: {addCleanDraft.departingGuestName ?? "Guest"} - Checkout{" "}
                    {formatTime(addCleanDraft.departingCheckout, "not set")}
                  </p>
                  <p>
                    Next arrival: {addCleanDraft.nextGuestName ?? "None on this date"}
                    {addCleanDraft.nextGuestName ? ` - Check-in ${formatTime(addCleanDraft.nextCheckIn, "not set")}` : ""}
                  </p>
                </div>
              ) : null}
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
                <p className="text-xs text-stone-500">Snapshotted when the clean is created.</p>
                {!selectedProperty ? (
                  <p className="text-sm leading-6 text-stone-700">Choose a property to load the bed setup.</p>
                ) : !selectedPropertyHasBedrooms ? (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                    Add at least one active bedroom before creating a clean for this property.
                  </p>
                ) : (
                  <div className="grid gap-1.5">
                    {selectedProperty.bedrooms.map((bedroom) => {
                      const requiredConfiguration = requiredConfigurations[bedroom.id] ?? bedroom.currentConfiguration;
                      const hasChanged = requiredConfiguration !== bedroom.currentConfiguration;
                      const isEditing = editingBedroomIds.includes(bedroom.id);

                      if (isEditing) {
                        return (
                          <div key={bedroom.id} className="grid gap-2 rounded-md border border-brand-border bg-white p-3">
                            <div>
                              <p className="text-sm font-semibold text-brand-ink">{bedroom.name}</p>
                              <p className="text-xs text-stone-600">
                                Current: {formatBedConfiguration(bedroom.currentConfiguration)}
                              </p>
                            </div>
                            <label className="grid gap-1.5 text-sm font-medium text-brand-ink">
                              Required setup
                              <select
                                value={requiredConfiguration}
                                onChange={(event) => {
                                  const nextConfiguration = event.target.value as BedConfiguration;
                                  updateRequiredConfiguration(bedroom.id, nextConfiguration);

                                  if (nextConfiguration === bedroom.currentConfiguration) {
                                    setEditingBedroomIds((current) => current.filter((id) => id !== bedroom.id));
                                  }
                                }}
                                className="min-h-11 rounded-md border border-brand-border bg-white px-3 text-base outline-none focus:border-brand-focus focus:ring-2 focus:ring-brand-focus/30"
                              >
                                {bedroom.permittedConfigurations.map((configuration) => (
                                  <option key={configuration} value={configuration}>
                                    {formatBedConfiguration(configuration)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            {hasChanged ? (
                              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
                                <p className="text-sm font-semibold text-amber-950">
                                  {formatBedConfiguration(bedroom.currentConfiguration)} -&gt;{" "}
                                  {formatBedConfiguration(requiredConfiguration)}
                                </p>
                                <p className="text-sm font-semibold text-amber-900">
                                  {getBedConfigurationAction({
                                    currentConfiguration: bedroom.currentConfiguration,
                                    requiredConfiguration
                                  })}
                                </p>
                              </div>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => resetBedroomSetupChange(bedroom)}
                              className="justify-self-start text-sm font-semibold text-brand-moss transition hover:text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2"
                            >
                              Cancel change
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={bedroom.id}
                          className={`grid gap-1 rounded-md border px-3 py-2 ${
                            hasChanged ? "border-amber-300 bg-amber-50" : "border-brand-border bg-white"
                          }`}
                        >
                          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3">
                            <span className="truncate text-sm font-semibold text-brand-ink">{bedroom.name}</span>
                            <span
                              className={`text-sm font-semibold ${
                                hasChanged ? "text-amber-950" : "text-stone-700"
                              }`}
                            >
                              {hasChanged
                                ? `${formatBedConfiguration(bedroom.currentConfiguration)} -> ${formatBedConfiguration(
                                    requiredConfiguration
                                  )}`
                                : formatBedConfiguration(bedroom.currentConfiguration)}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleBedroomSetupEditor(bedroom.id)}
                              className="text-sm font-semibold text-brand-moss transition hover:text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2"
                            >
                              {hasChanged ? "Edit" : "Change"}
                            </button>
                          </div>
                          {hasChanged ? (
                            <p className="text-sm font-semibold text-amber-900">
                              {getBedConfigurationAction({
                                currentConfiguration: bedroom.currentConfiguration,
                                requiredConfiguration
                              })}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
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

            <details className="rounded-md border border-brand-border bg-white" open={showGuestOverride || showInstructions || showNotes}>
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

      <ModalSheet title="Booking details" isOpen={Boolean(selectedBooking)} onClose={() => setSelectedBooking(null)}>
        {selectedBooking ? (
          <div className="grid gap-4">
            <section className="grid gap-3 rounded-md border border-brand-border p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-brand-ink">{selectedBooking.guestName || "Guest"}</h3>
                  <p className="text-sm text-stone-600">{selectedBooking.propertyName}</p>
                </div>
                <span className="inline-flex w-fit rounded-full bg-brand-muted px-3 py-1 text-sm font-semibold text-brand-darkSlate">
                  {selectedBooking.bookingType || "Booking"}
                </span>
              </div>
              <div className="grid gap-2 text-sm text-stone-700 sm:grid-cols-2">
                <p>Channel: {selectedBooking.channelName ?? "Unknown"}</p>
                <p>Reference: {selectedBooking.smoobuReferenceId ?? "Not supplied"}</p>
                <p>Arrival: {formatDate(selectedBooking.arrivalDate)}</p>
                <p>Check-in: {formatTime(selectedBooking.checkInTime)}</p>
                <p>Departure: {formatDate(selectedBooking.departureDate)}</p>
                <p>Check-out: {formatTime(selectedBooking.checkOutTime)}</p>
                <p>Adults: {selectedBooking.adults ?? "Not set"}</p>
                <p>Children: {selectedBooking.children ?? "Not set"}</p>
              </div>
            </section>

            <section className="grid gap-2 rounded-md border border-brand-border p-3">
              <h3 className="text-sm font-semibold text-brand-ink">Contact</h3>
              <p className="text-sm text-stone-700">Email: {selectedBooking.guestEmail ?? "Not supplied"}</p>
              <p className="text-sm text-stone-700">Phone: {selectedBooking.guestPhone ?? "Not supplied"}</p>
              <p className="text-sm text-stone-700">Language: {selectedBooking.guestLanguage ?? "Not supplied"}</p>
            </section>

            {selectedBooking.notice ? (
              <section className="grid gap-2 rounded-md border border-brand-border p-3">
                <h3 className="text-sm font-semibold text-brand-ink">Notes</h3>
                <p className="whitespace-pre-wrap text-sm text-stone-700">{selectedBooking.notice}</p>
              </section>
            ) : null}

            <section className="grid gap-3 rounded-md border border-brand-border p-3">
              <h3 className="text-sm font-semibold text-brand-ink">Cleaning</h3>
              {selectedBooking.cleanReviewRequired ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                  {selectedBooking.cleanReviewReason ?? "Booking changes need review."}
                </p>
              ) : null}
              {selectedBooking.linkedJobs.length > 0 ? (
                <div className="grid gap-2">
                  {selectedBooking.linkedJobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`${jobDetailBasePath}/${job.id}`}
                      className="rounded-md bg-brand-muted px-3 py-2 text-sm font-semibold text-brand-ink"
                    >
                      {cleaningTypeLabels[job.cleaningType]} - {formatDate(job.scheduledDate)} - {statusLabels[job.status]}
                    </Link>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openAddClean(selectedBooking.departureDate, selectedBooking)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-primary px-4 text-sm font-semibold text-brand-primaryForeground transition hover:bg-brand-primaryHover focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2 sm:w-fit"
                >
                  <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                  Create clean
                </button>
              )}
            </section>

            <section className="grid gap-3 rounded-md border border-brand-border p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-brand-ink">
                  <Mail className="h-4 w-4 text-brand-darkSlate" aria-hidden="true" />
                  Messages
                </h3>
                <button
                  type="button"
                  onClick={() => loadMessages(selectedBooking.id)}
                  className="min-h-10 rounded-md border border-brand-slate px-3 text-sm font-semibold text-brand-ink transition hover:bg-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-focus focus:ring-offset-2"
                >
                  Retry
                </button>
              </div>
              {isLoadingMessages ? <p className="text-sm text-stone-600">Loading messages...</p> : null}
              {messagesError ? <p className="text-sm font-medium text-amber-700">{messagesError}</p> : null}
              {!isLoadingMessages && !messagesError && messages.length === 0 ? (
                <p className="text-sm text-stone-600">No guest-related messages returned.</p>
              ) : null}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`grid gap-1 rounded-md px-3 py-2 text-sm ${
                    message.direction === "incoming"
                      ? "border border-brand-border bg-white text-stone-700"
                      : "bg-brand-muted text-brand-ink"
                  }`}
                >
                  <p className="font-semibold">{message.direction === "incoming" ? "Guest" : "Accolade"}</p>
                  {message.subject ? <p className="text-xs font-medium text-stone-500">{message.subject}</p> : null}
                  <p className="whitespace-pre-wrap">{message.body}</p>
                </div>
              ))}
            </section>

            <section className="grid gap-2 rounded-md border border-brand-border p-3">
              <h3 className="text-sm font-semibold text-brand-ink">Smoobu</h3>
              <p className="text-sm text-stone-700">Reservation ID: {selectedBooking.smoobuReservationId}</p>
              <p className="text-sm text-stone-700">Apartment: {selectedBooking.smoobuApartmentName}</p>
              <p className="text-sm text-stone-700">Last synced: {formatDateTime(selectedBooking.lastSyncedAt)}</p>
              {selectedBooking.guestAppUrl ? (
                <a
                  href={selectedBooking.guestAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-brand-primary"
                >
                  Guest app
                </a>
              ) : null}
            </section>
          </div>
        ) : null}
      </ModalSheet>
    </>
  );
}
