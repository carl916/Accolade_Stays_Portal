import { describe, expect, it } from "vitest";
import { getSupabaseSignInErrorMessage } from "@/lib/auth/errors";

describe("getSupabaseSignInErrorMessage", () => {
  it("explains unconfirmed emails", () => {
    expect(getSupabaseSignInErrorMessage({ message: "Email not confirmed" })).toContain("not been confirmed");
  });

  it("explains Supabase project configuration errors", () => {
    expect(getSupabaseSignInErrorMessage({ message: "Invalid API key", status: 401 })).toContain("Supabase URL");
  });

  it("explains invalid credentials without implying the app profile failed", () => {
    expect(getSupabaseSignInErrorMessage({ message: "Invalid login credentials" })).toContain("Supabase project");
  });
});
