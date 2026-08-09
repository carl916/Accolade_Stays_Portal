import { describe, expect, it, vi } from "vitest";
import { getInviteAcceptUrl, getPublicAppEnv, getPublicSiteUrl } from "@/lib/env";

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

describe("getPublicSiteUrl", () => {
  it("normalises the configured site URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://portal.example.com/");

    expect(getPublicSiteUrl()).toBe("https://portal.example.com");
    expect(getInviteAcceptUrl()).toBe("https://portal.example.com/auth/accept-invite");

    vi.unstubAllEnvs();
  });

  it("supports Vercel hostnames without a protocol", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", undefined);
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "preview.example.vercel.app");

    expect(getPublicSiteUrl()).toBe("https://preview.example.vercel.app");

    vi.unstubAllEnvs();
  });
});
