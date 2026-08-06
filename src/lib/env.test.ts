import { describe, expect, it, vi } from "vitest";
import { getPublicAppEnv } from "@/lib/env";

describe("getPublicAppEnv", () => {
  it("defaults to Local when no public app environment is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", undefined);

    expect(getPublicAppEnv()).toBe("Local");

    vi.unstubAllEnvs();
  });

  it("returns the configured public app environment", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "Staging");

    expect(getPublicAppEnv()).toBe("Staging");

    vi.unstubAllEnvs();
  });
});
