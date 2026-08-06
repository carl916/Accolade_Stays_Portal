import { describe, expect, it } from "vitest";
import {
  canCleanerAccessJob,
  canManageOperations,
  canTransitionCleaningJobStatus,
  cleaningTypes,
  getRoleHomePath,
  initialLinenItemNames,
  initialPropertyNames,
  isRoleAllowed,
  requiresReviewForFinalBedConfiguration
} from "@/lib/domain/operations";

describe("operations domain rules", () => {
  it("allows administrators and cleaning managers to manage operations", () => {
    expect(canManageOperations("administrator")).toBe(true);
    expect(canManageOperations("cleaning_manager")).toBe(true);
    expect(canManageOperations("cleaner")).toBe(false);
  });

  it("limits cleaner job access to their own assigned jobs", () => {
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

  it("keeps the initial property list aligned with the product brief", () => {
    expect(initialPropertyNames).toEqual(["St Andrews", "Brahms", "Rossini"]);
  });

  it("keeps initial cleaning types aligned with the MVP", () => {
    expect(cleaningTypes).toEqual(["standard_changeover", "mid_stay_clean", "deep_or_remedial_clean", "other"]);
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
