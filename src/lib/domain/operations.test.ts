import { describe, expect, it } from "vitest";
import {
  bedroomSetupBedConfigurations,
  bedroomSetupPhysicalBedTypes,
  calculateActualLabourMinutes,
  calculateElapsedCleaningMinutes,
  calculateExpectedElapsedMinutes,
  calculateLabourVarianceMinutes,
  canCleanerAccessJob,
  canManageOperations,
  canManageSettings,
  canTransitionCleaningJobStatus,
  cleaningResourceTypes,
  cleaningTypes,
  defaultGuestCheckInTime,
  formatBedConfiguration,
  formatCleaningDurationAsTime,
  formatCleaningDurationForClean,
  formatCleaningDurationForPropertyCard,
  formatCleaningDurationForPropertyDetail,
  formatCleaningDurationOption,
  getBedConfigurationAction,
  getCleaningJobStatusLabel,
  getDefaultGuestArrivalDeadlineIso,
  getDefaultLabourMultiplier,
  getEffectiveLabourMultiplier,
  getRoleHomePath,
  initialLinenItemNames,
  initialPropertyNames,
  isLongCleanByLabour,
  isCleaningJobNeedsManagerReview,
  isRoleAllowed,
  requiresReviewForFinalBedConfiguration,
  supportedCleaningDurationSchema,
  supportedCleaningDurations
} from "@/lib/domain/operations";

describe("operations domain rules", () => {
  it("allows administrators and cleaning managers to manage operations", () => {
    expect(canManageOperations("administrator")).toBe(true);
    expect(canManageOperations("cleaning_manager")).toBe(true);
    expect(canManageOperations("cleaner")).toBe(false);
  });

  it("limits settings management to administrators", () => {
    expect(canManageSettings("administrator")).toBe(true);
    expect(canManageSettings("cleaning_manager")).toBe(false);
    expect(canManageSettings("cleaner")).toBe(false);
  });

  it("limits cleaner job access to their own assigned jobs or assigned resource login", () => {
    expect(
      canCleanerAccessJob({
        role: "cleaner",
        userId: "user-1",
        assignedCleanerId: "user-1"
      })
    ).toBe(true);

    expect(
      canCleanerAccessJob({
        role: "cleaner",
        userId: "user-1",
        assignedCleanerId: "user-2"
      })
    ).toBe(false);

    expect(
      canCleanerAccessJob({
        role: "cleaner",
        userId: "user-1",
        assignedCleanerId: null,
        assignedResourcePrimaryUserId: "user-1"
      })
    ).toBe(true);
  });

  it("maps roles to their dashboard routes", () => {
    expect(getRoleHomePath("administrator")).toBe("/admin");
    expect(getRoleHomePath("cleaning_manager")).toBe("/manager");
    expect(getRoleHomePath("cleaner")).toBe("/cleaner");
  });

  it("checks allowed route roles", () => {
    expect(isRoleAllowed("administrator", ["administrator"])).toBe(true);
    expect(isRoleAllowed("cleaner", ["administrator", "cleaning_manager"])).toBe(false);
    expect(isRoleAllowed(null, ["cleaner"])).toBe(false);
  });

  it("keeps cancelled jobs terminal", () => {
    expect(canTransitionCleaningJobStatus("cancelled", "awaiting_approval")).toBe(false);
  });

  it("allows the normal cleaner progression from accepted to in progress", () => {
    expect(canTransitionCleaningJobStatus("accepted", "in_progress")).toBe(true);
  });

  it("uses operational cleaning manager status labels", () => {
    expect(getCleaningJobStatusLabel({ status: "awaiting_approval" })).toBe("Needs review");
    expect(getCleaningJobStatusLabel({ status: "awaiting_cleaner_response" })).toBe("Confirmed - Unassigned");
    expect(
      getCleaningJobStatusLabel({
        status: "awaiting_cleaner_response",
        assignedCleanerName: "Sarah Jones"
      })
    ).toBe("Assigned - Sarah Jones");
    expect(isCleaningJobNeedsManagerReview({ status: "awaiting_approval" })).toBe(true);
    expect(isCleaningJobNeedsManagerReview({ status: "awaiting_cleaner_response" })).toBe(false);
  });

  it("requires review when final bed configuration differs from required configuration", () => {
    expect(
      requiresReviewForFinalBedConfiguration({
        requiredConfiguration: "king",
        finalConfiguration: "two_singles"
      })
    ).toBe(true);

    expect(
      requiresReviewForFinalBedConfiguration({
        requiredConfiguration: "king",
        finalConfiguration: "king"
      })
    ).toBe(false);
  });

  it("calculates bed configuration action labels", () => {
    expect(getBedConfigurationAction({ currentConfiguration: "king", requiredConfiguration: "king" })).toBe(
      "No change"
    );
    expect(getBedConfigurationAction({ currentConfiguration: "king", requiredConfiguration: "two_singles" })).toBe(
      "Split bed"
    );
    expect(getBedConfigurationAction({ currentConfiguration: "two_singles", requiredConfiguration: "king" })).toBe(
      "Join beds"
    );
    expect(getBedConfigurationAction({ currentConfiguration: "unknown", requiredConfiguration: "double" })).toBe(
      "Confirm current setup, then configure as Double"
    );
  });

  it("limits bedroom setup options to the simplified property workflow", () => {
    expect(bedroomSetupPhysicalBedTypes).toEqual(["zip_and_link", "fixed_double"]);
    expect(bedroomSetupBedConfigurations).toEqual(["king", "double", "two_singles"]);
    expect(formatBedConfiguration("two_singles")).toBe("Twin");
  });

  it("keeps the initial property list aligned with the product brief", () => {
    expect(initialPropertyNames).toEqual(["St Andrews", "Brahms", "Rossini"]);
  });

  it("keeps initial cleaning types aligned with the MVP", () => {
    expect(cleaningTypes).toEqual(["standard_changeover", "mid_stay_clean", "deep_or_remedial_clean", "other"]);
  });

  it("models individual and pair cleaning resources as one assignable option", () => {
    expect(cleaningResourceTypes).toEqual(["individual", "pair"]);
    expect(getDefaultLabourMultiplier("individual")).toBe(1);
    expect(getDefaultLabourMultiplier("pair")).toBe(2);
  });

  it("calculates expected working time from expected labour and assigned resource", () => {
    expect(calculateExpectedElapsedMinutes({ expectedLabourMinutes: 150, labourMultiplier: 1 })).toBe(150);
    expect(calculateExpectedElapsedMinutes({ expectedLabourMinutes: 150, labourMultiplier: 2 })).toBe(75);
    expect(formatCleaningDurationAsTime(75)).toBe("1 hour 15 minutes");
  });

  it("calculates actual labour from elapsed clean time and effective multiplier", () => {
    expect(calculateActualLabourMinutes({ elapsedMinutes: 120, effectiveLabourMultiplier: 1 })).toBe(120);
    expect(calculateActualLabourMinutes({ elapsedMinutes: 90, effectiveLabourMultiplier: 2 })).toBe(180);
    expect(calculateActualLabourMinutes({ elapsedMinutes: 75, effectiveLabourMultiplier: 2 })).toBe(150);
  });

  it("allows a pair to work solo without doubling actual labour", () => {
    const effectiveMultiplier = getEffectiveLabourMultiplier({
      resourceType: "pair",
      assignedLabourMultiplier: 2,
      workingMode: "solo"
    });

    expect(effectiveMultiplier).toBe(1);
    expect(calculateActualLabourMinutes({ elapsedMinutes: 120, effectiveLabourMultiplier: effectiveMultiplier })).toBe(120);
  });

  it("keeps historic labour calculations tied to the effective multiplier snapshot", () => {
    expect(calculateActualLabourMinutes({ elapsedMinutes: 90, effectiveLabourMultiplier: 2 })).toBe(180);
    expect(calculateActualLabourMinutes({ elapsedMinutes: 90, effectiveLabourMultiplier: 1 })).toBe(90);
  });

  it("compares expected against actual labour while elapsed time remains clock time", () => {
    const elapsedMinutes = calculateElapsedCleaningMinutes({
      startedAt: "2026-08-08T10:30:00.000Z",
      completedAt: "2026-08-08T12:00:00.000Z"
    });
    const actualLabourMinutes = calculateActualLabourMinutes({
      elapsedMinutes: elapsedMinutes ?? 0,
      effectiveLabourMultiplier: 2
    });

    expect(elapsedMinutes).toBe(90);
    expect(actualLabourMinutes).toBe(180);
    expect(calculateLabourVarianceMinutes({ expectedLabourMinutes: 150, actualLabourMinutes })).toBe(30);
    expect(isLongCleanByLabour({ expectedLabourMinutes: 150, actualLabourMinutes })).toBe(false);
  });

  it("formats and validates supported property cleaning durations", () => {
    expect(supportedCleaningDurations).toEqual([120, 150, 180]);
    expect(formatCleaningDurationOption(120)).toBe("2 hours");
    expect(formatCleaningDurationOption(150)).toBe("2 hours 30 minutes");
    expect(formatCleaningDurationOption(180)).toBe("3 hours");
    expect(formatCleaningDurationForPropertyCard(150)).toBe("2 hr 30 min clean");
    expect(formatCleaningDurationForPropertyDetail(120)).toBe("2 hour default clean");
    expect(formatCleaningDurationForPropertyDetail(125)).toBe("2 hour 5 minute default clean");
    expect(formatCleaningDurationForClean(180)).toBe("3 hour clean");
    expect(supportedCleaningDurationSchema.safeParse("150").success).toBe(true);
    expect(supportedCleaningDurationSchema.safeParse("125").success).toBe(false);
  });

  it("keeps the normal guest arrival deadline at the default check-in time", () => {
    const deadline = new Date(getDefaultGuestArrivalDeadlineIso("2026-08-07"));

    expect(defaultGuestCheckInTime).toBe("16:00");
    expect(deadline.getFullYear()).toBe(2026);
    expect(deadline.getMonth()).toBe(7);
    expect(deadline.getDate()).toBe(7);
    expect(deadline.getHours()).toBe(16);
    expect(deadline.getMinutes()).toBe(0);
  });

  it("seeds the configurable MVP linen items", () => {
    expect(initialLinenItemNames).toEqual([
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
    ]);
  });
});
