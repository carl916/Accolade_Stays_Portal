import { z } from "zod";

export const appRoles = ["administrator", "cleaning_manager", "cleaner"] as const;

export const cleaningJobStatuses = [
  "awaiting_approval",
  "awaiting_cleaner_response",
  "accepted",
  "in_progress",
  "completed",
  "requires_review",
  "cancelled"
] as const;

export const cleaningTypes = ["standard_changeover", "mid_stay_clean", "deep_or_remedial_clean", "other"] as const;

export const cleaningResourceTypes = ["individual", "pair"] as const;
export const cleaningResourceWorkingModes = ["as_assigned", "solo"] as const;

export const physicalBedTypes = ["zip_and_link", "fixed_double", "fixed_single", "other"] as const;

export const bedroomSetupPhysicalBedTypes = ["zip_and_link", "fixed_double"] as const;

export const bedConfigurations = [
  "king",
  "double",
  "two_singles",
  "single",
  "unmade",
  "other",
  "unknown"
] as const;

export const bedroomSetupBedConfigurations = ["king", "double", "two_singles"] as const;

export const zipAndLinkBedConfigurations = ["king", "two_singles"] as const;

export const longCleanReasons = [
  "property_exceptionally_dirty",
  "excessive_rubbish",
  "guest_departure_delay",
  "access_delay",
  "additional_beds_required",
  "linen_problem",
  "damage_or_maintenance_issue",
  "missing_supplies",
  "cleaner_interruption",
  "other"
] as const;

export const supportedCleaningDurations = [120, 150, 180] as const;
export const defaultGuestCheckInTime = "16:00";

export type AppRole = (typeof appRoles)[number];
export type CleaningJobStatus = (typeof cleaningJobStatuses)[number];
export type CleaningType = (typeof cleaningTypes)[number];
export type CleaningResourceType = (typeof cleaningResourceTypes)[number];
export type CleaningResourceWorkingMode = (typeof cleaningResourceWorkingModes)[number];
export type PhysicalBedType = (typeof physicalBedTypes)[number];
export type BedroomSetupPhysicalBedType = (typeof bedroomSetupPhysicalBedTypes)[number];
export type BedConfiguration = (typeof bedConfigurations)[number];
export type BedroomSetupBedConfiguration = (typeof bedroomSetupBedConfigurations)[number];
export type LongCleanReason = (typeof longCleanReasons)[number];
export type SupportedCleaningDuration = (typeof supportedCleaningDurations)[number];

export const appRoleSchema = z.enum(appRoles);
export const cleaningJobStatusSchema = z.enum(cleaningJobStatuses);
export const cleaningTypeSchema = z.enum(cleaningTypes);
export const cleaningResourceTypeSchema = z.enum(cleaningResourceTypes);
export const cleaningResourceWorkingModeSchema = z.enum(cleaningResourceWorkingModes);
export const physicalBedTypeSchema = z.enum(physicalBedTypes);
export const bedroomSetupPhysicalBedTypeSchema = z.enum(bedroomSetupPhysicalBedTypes);
export const bedConfigurationSchema = z.enum(bedConfigurations);
export const bedroomSetupBedConfigurationSchema = z.enum(bedroomSetupBedConfigurations);
export const longCleanReasonSchema = z.enum(longCleanReasons);
export const supportedCleaningDurationSchema = z.coerce
  .number()
  .refine(
    (value): value is SupportedCleaningDuration =>
      supportedCleaningDurations.includes(value as SupportedCleaningDuration),
    "Choose a supported cleaning duration."
  );

export const initialPropertyNames = ["St Andrews", "Brahms", "Rossini"] as const;

export const initialLinenItemNames = [
  "King duvet covers",
  "Double duvet covers",
  "Single duvet covers",
  "King fitted sheets",
  "Double fitted sheets",
  "Single fitted sheets",
  "Pillowcases",
  "Bath towels",
  "Hand towels",
  "Bath mats",
  "Tea towels"
] as const;

export const roleHomePaths = {
  administrator: "/admin",
  cleaning_manager: "/manager",
  cleaner: "/cleaner"
} satisfies Record<AppRole, string>;

export const cleaningJobStatusTransitions = {
  awaiting_approval: ["awaiting_cleaner_response", "cancelled"],
  awaiting_cleaner_response: ["accepted", "awaiting_approval", "cancelled"],
  accepted: ["in_progress", "awaiting_cleaner_response", "cancelled"],
  in_progress: ["completed", "requires_review", "cancelled"],
  completed: ["requires_review"],
  requires_review: ["completed", "cancelled"],
  cancelled: []
} satisfies Record<CleaningJobStatus, CleaningJobStatus[]>;

export function canManageOperations(role: AppRole | null | undefined) {
  return role === "administrator" || role === "cleaning_manager";
}

export function canManageSettings(role: AppRole | null | undefined) {
  return role === "administrator";
}

export function canCleanerAccessJob(args: {
  role: AppRole | null | undefined;
  userId: string | null | undefined;
  assignedCleanerId: string | null | undefined;
  assignedResourcePrimaryUserId?: string | null | undefined;
}) {
  return (
    args.role === "cleaner" &&
    Boolean(args.userId) &&
    (args.userId === args.assignedCleanerId || args.userId === args.assignedResourcePrimaryUserId)
  );
}

export function getRoleHomePath(role: AppRole) {
  return roleHomePaths[role];
}

export function isRoleAllowed(role: AppRole | null | undefined, allowedRoles: readonly AppRole[]) {
  if (!role) {
    return false;
  }

  return allowedRoles.includes(role);
}

export function canTransitionCleaningJobStatus(from: CleaningJobStatus, to: CleaningJobStatus) {
  return (cleaningJobStatusTransitions[from] as readonly CleaningJobStatus[]).includes(to);
}

export function getCleaningJobStatusLabel(args: {
  status: CleaningJobStatus;
  assignedCleanerName?: string | null;
  assignedResourceName?: string | null;
  requiresReview?: boolean;
  bookingChangeRequiresReview?: boolean;
}) {
  const assignedName = args.assignedResourceName ?? args.assignedCleanerName;

  if (args.status === "awaiting_approval") {
    return "Needs review";
  }

  if (args.status === "awaiting_cleaner_response") {
    return assignedName ? `Assigned - ${assignedName}` : "Confirmed - Unassigned";
  }

  if (args.status === "accepted") {
    return assignedName ? `Accepted - ${assignedName}` : "Accepted";
  }

  if (args.status === "requires_review" || args.requiresReview || args.bookingChangeRequiresReview) {
    return "Requires review";
  }

  const labels = {
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled"
  } satisfies Partial<Record<CleaningJobStatus, string>>;

  return labels[args.status] ?? args.status;
}

export function isCleaningJobNeedsManagerReview(args: {
  status: CleaningJobStatus;
  requiresReview?: boolean;
  bookingChangeRequiresReview?: boolean;
}) {
  return args.status === "awaiting_approval" || args.status === "requires_review" || Boolean(args.requiresReview) || Boolean(args.bookingChangeRequiresReview);
}

export function getBedConfigurationAction(args: {
  currentConfiguration: BedConfiguration;
  requiredConfiguration: BedConfiguration;
}) {
  if (args.currentConfiguration === args.requiredConfiguration && args.currentConfiguration !== "unknown") {
    return "No change";
  }

  if (args.currentConfiguration === "unknown") {
    return `Confirm current setup, then configure as ${formatBedConfiguration(args.requiredConfiguration)}`;
  }

  if (args.currentConfiguration === "unmade") {
    return `Make as ${formatBedConfiguration(args.requiredConfiguration)}`;
  }

  if (args.currentConfiguration === "king" && args.requiredConfiguration === "two_singles") {
    return "Split bed";
  }

  if (args.currentConfiguration === "two_singles" && args.requiredConfiguration === "king") {
    return "Join beds";
  }

  return `Change to ${formatBedConfiguration(args.requiredConfiguration)}`;
}

export function formatBedConfiguration(configuration: BedConfiguration) {
  const labels = {
    king: "King",
    double: "Double",
    two_singles: "Twin",
    single: "Single",
    unmade: "Unmade",
    other: "Other",
    unknown: "Unknown"
  } satisfies Record<BedConfiguration, string>;

  return labels[configuration];
}

function formatHoursAndMinutes(minutes: number, unitStyle: "short" | "long" | "compound") {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const parts: string[] = [];

  if (hours > 0) {
    parts.push(
      unitStyle === "short"
        ? `${hours} hr`
        : `${hours} ${unitStyle === "compound" || hours === 1 ? "hour" : "hours"}`
    );
  }

  if (remainingMinutes > 0 || parts.length === 0) {
    parts.push(
      unitStyle === "short"
        ? `${remainingMinutes} min`
        : `${remainingMinutes} ${unitStyle === "compound" || remainingMinutes === 1 ? "minute" : "minutes"}`
    );
  }

  return parts.join(" ");
}

export function formatCleaningDurationOption(minutes: number) {
  return formatHoursAndMinutes(minutes, "long");
}

export function formatCleaningDurationForPropertyCard(minutes: number) {
  return `${formatHoursAndMinutes(minutes, "short")} clean`;
}

export function formatCleaningDurationForPropertyDetail(minutes: number) {
  return `${formatHoursAndMinutes(minutes, "compound")} default clean`;
}

export function formatCleaningDurationForClean(minutes: number) {
  return `${formatHoursAndMinutes(minutes, "compound")} clean`;
}

export function formatCleaningDurationAsTime(minutes: number) {
  return formatHoursAndMinutes(minutes, "long");
}

export function isSupportedCleaningDuration(minutes: number): minutes is SupportedCleaningDuration {
  return supportedCleaningDurations.includes(minutes as SupportedCleaningDuration);
}

export function getDefaultGuestArrivalDeadlineIso(scheduledDate: string) {
  return new Date(`${scheduledDate}T${defaultGuestCheckInTime}:00`).toISOString();
}

export function requiresReviewForFinalBedConfiguration(args: {
  requiredConfiguration: BedConfiguration;
  finalConfiguration: BedConfiguration | null | undefined;
}) {
  return Boolean(args.finalConfiguration) && args.finalConfiguration !== args.requiredConfiguration;
}

export function getDefaultLabourMultiplier(resourceType: CleaningResourceType) {
  return resourceType === "pair" ? 2 : 1;
}

export function getCleaningResourceTypeLabel(resourceType: CleaningResourceType) {
  return resourceType === "pair" ? "Pair" : "Individual";
}

export function getWorkingModeLabel(workingMode: CleaningResourceWorkingMode | null | undefined) {
  if (workingMode === "solo") {
    return "Solo";
  }

  return "As pair";
}

export function getEffectiveLabourMultiplier(args: {
  resourceType: CleaningResourceType;
  assignedLabourMultiplier: number;
  workingMode?: CleaningResourceWorkingMode | null;
}) {
  if (args.resourceType === "pair" && args.workingMode === "solo") {
    return 1;
  }

  return args.assignedLabourMultiplier;
}

export function calculateExpectedElapsedMinutes(args: {
  expectedLabourMinutes: number;
  labourMultiplier: number | null | undefined;
}) {
  const multiplier = args.labourMultiplier && args.labourMultiplier > 0 ? args.labourMultiplier : 1;

  return Math.ceil(args.expectedLabourMinutes / multiplier);
}

export function calculateActualLabourMinutes(args: {
  elapsedMinutes: number;
  effectiveLabourMultiplier: number | null | undefined;
}) {
  const multiplier = args.effectiveLabourMultiplier && args.effectiveLabourMultiplier > 0 ? args.effectiveLabourMultiplier : 1;

  return Math.round(args.elapsedMinutes * multiplier);
}

export function calculateElapsedCleaningMinutes(args: {
  startedAt: string | null | undefined;
  completedAt: string | null | undefined;
}) {
  if (!args.startedAt || !args.completedAt) {
    return null;
  }

  const startedAt = new Date(args.startedAt).getTime();
  const completedAt = new Date(args.completedAt).getTime();

  if (!Number.isFinite(startedAt) || !Number.isFinite(completedAt) || completedAt < startedAt) {
    return null;
  }

  return Math.round((completedAt - startedAt) / 60000);
}

export function calculateLabourVarianceMinutes(args: {
  expectedLabourMinutes: number;
  actualLabourMinutes: number | null | undefined;
}) {
  return args.actualLabourMinutes === null || args.actualLabourMinutes === undefined
    ? null
    : args.actualLabourMinutes - args.expectedLabourMinutes;
}

export function isLongCleanByLabour(args: {
  expectedLabourMinutes: number;
  actualLabourMinutes: number | null | undefined;
  thresholdMinutes?: number;
}) {
  const variance = calculateLabourVarianceMinutes(args);

  return variance !== null && variance > (args.thresholdMinutes ?? 60);
}
