import { describe, expect, it } from "vitest";
import { setPasswordSchema, signInSchema } from "@/lib/auth/validation";

describe("signInSchema", () => {
  it("accepts email and password credentials", () => {
    expect(
      signInSchema.safeParse({
        email: "admin@example.com",
        password: "password"
      }).success
    ).toBe(true);
  });

  it("rejects invalid email addresses", () => {
    expect(
      signInSchema.safeParse({
        email: "not-an-email",
        password: "password"
      }).success
    ).toBe(false);
  });
});

describe("setPasswordSchema", () => {
  it("accepts matching passwords with at least 8 characters", () => {
    expect(
      setPasswordSchema.safeParse({
        password: "new-password",
        confirmPassword: "new-password"
      }).success
    ).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    expect(
      setPasswordSchema.safeParse({
        password: "new-password",
        confirmPassword: "different-password"
      }).success
    ).toBe(false);
  });
});
