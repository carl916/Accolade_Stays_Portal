import { describe, expect, it } from "vitest";
import { getCleanAddAffordanceVariant } from "./clean-add-affordance";

describe("getCleanAddAffordanceVariant", () => {
  it("uses the full ghost panel in an empty week", () => {
    expect(getCleanAddAffordanceVariant({ dayCleanCount: 0, weekMaxCleanCount: 0 })).toBe("full");
  });

  it("uses the full ghost panel when the date has spare row capacity", () => {
    expect(getCleanAddAffordanceVariant({ dayCleanCount: 1, weekMaxCleanCount: 2 })).toBe("full");
    expect(getCleanAddAffordanceVariant({ dayCleanCount: 1, weekMaxCleanCount: 3 })).toBe("full");
  });

  it("uses the compact button when the date is at the visible row capacity", () => {
    expect(getCleanAddAffordanceVariant({ dayCleanCount: 3, weekMaxCleanCount: 3 })).toBe("compact");
  });
});
