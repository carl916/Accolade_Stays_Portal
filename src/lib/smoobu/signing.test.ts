import { describe, expect, it } from "vitest";
import { buildCanonicalQuery, buildCanonicalRequest, signSmoobuRequest } from "./signing";

describe("Smoobu HMAC signing", () => {
  it("sorts canonical query parameters alphabetically", () => {
    expect(
      buildCanonicalQuery({
        to: "2026-04-10",
        pageSize: 100,
        from: "2026-04-01",
        empty: "",
        missing: undefined
      })
    ).toBe("from=2026-04-01&pageSize=100&to=2026-04-10");
  });

  it("builds the documented canonical request shape", () => {
    expect(
      buildCanonicalRequest({
        method: "GET",
        path: "/api/reservations",
        query: {
          to: "2026-04-10",
          from: "2026-04-01"
        },
        timestamp: "2026-04-01T12:00:00.000Z",
        nonce: "550e8400-e29b-41d4-a716-446655440000",
        body: "",
        apiKey: "usr_live_abc123"
      })
    ).toBe(
      [
        "GET",
        "/api/reservations",
        "from=2026-04-01&to=2026-04-10",
        "2026-04-01T12:00:00.000Z",
        "550e8400-e29b-41d4-a716-446655440000",
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "usr_live_abc123"
      ].join("\n")
    );
  });

  it("signs a deterministic fixture with HMAC-SHA256 base64 output", () => {
    expect(
      signSmoobuRequest({
        method: "GET",
        path: "/api/reservations",
        query: {
          to: "2026-04-10",
          from: "2026-04-01"
        },
        timestamp: "2026-04-01T12:00:00.000Z",
        nonce: "550e8400-e29b-41d4-a716-446655440000",
        apiKey: "usr_live_abc123",
        apiSecret: "test_secret"
      })
    ).toBe("DKdyfeh4OxCZPtPizGB704fw5WC812SgVDpzpn1SIxE=");
  });
});
