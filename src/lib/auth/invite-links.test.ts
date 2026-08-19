import { describe, expect, it } from "vitest";
import {
  buildInviteAcceptRedirect,
  ensureInviteAcceptRedirect,
  shouldRedirectToInviteAccept
} from "@/lib/auth/invite-links";

describe("invite callback links", () => {
  it("redirects root auth callback codes to the invite acceptance page", () => {
    expect(shouldRedirectToInviteAccept({ code: "abc123" })).toBe(true);
    expect(buildInviteAcceptRedirect({ code: "abc123" })).toBe("/auth/accept-invite?code=abc123");
  });

  it("preserves Supabase callback errors for the invite acceptance page", () => {
    expect(
      buildInviteAcceptRedirect({
        error: "access_denied",
        error_description: "Invite expired"
      })
    ).toBe("/auth/accept-invite?error=access_denied&error_description=Invite+expired");
  });

  it("normalises generated Supabase invite links to the password setup route", () => {
    expect(
      ensureInviteAcceptRedirect(
        "https://project.supabase.co/auth/v1/verify?token=token&type=invite&redirect_to=https%3A%2F%2Fportal.example.com%2F",
        "https://portal.example.com/auth/accept-invite"
      )
    ).toBe(
      "https://project.supabase.co/auth/v1/verify?token=token&type=invite&redirect_to=https%3A%2F%2Fportal.example.com%2Fauth%2Faccept-invite"
    );
  });
});
