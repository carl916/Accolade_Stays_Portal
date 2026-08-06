import { describe, expect, it } from "vitest";
import { signInSchema } from "@/lib/auth/validation";

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
