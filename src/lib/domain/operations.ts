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

export const physicalBedTypes = ["zip_and_link", "fixed_double", "fixed_single", "other"] as const;

export const bedConfigurations = [
  "king",
  "double",
  "two_singles",
  "single",
  "unmade",
  "other",
  "unknown"
] as const;

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

export type AppRole = (typeof appRoles)[number];
export type CleaningJobStatus = (typeof cleaningJobStatuses)[number];
export type CleaningType = (typeof cleaningTypes)[number];
export type PhysicalBedType = (typeof physicalBedTypes)[number];
export type BedConfiguration = (typeof bedConfigurations)[number];
export type LongCleanReason = (typeof longCleanReasons)[number];

export const appRoleSchema = z.enum(appRoles);
export const cleaningJobStatusSchema = z.enum(cleaningJobStatuses);
export const cleaningTypeSchema = z.enum(cleaningTypes);
export const physicalBedTypeSchema = z.enum(physicalBedTypes);
export const bedConfigurationSchema = z.enum(bedConfigurations);
export const longCleanReasonSchema = z.enum(longCleanReasons);

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

export function canCleanerAccessJob(args: {
  role: AppRole | null | undefined;
  userId: string | null | undefined;
  assignedCleanerId: string | null | undefined;
}) {
  return args.role === "cleaner" && Boolean(args.userId) && args.userId === args.assignedCleanerId;
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

export function requiresReviewForFinalBedConfiguration(args: {
  requiredConfiguration: BedConfiguration;
  finalConfiguration: BedConfiguration | null | undefined;
}) {
  return Boolean(args.finalConfiguration) && args.finalConfiguration !== args.requiredConfiguration;
}
