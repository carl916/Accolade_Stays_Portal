import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createSmoobuClient } from "./client";

describe("Smoobu client", () => {
  it("generates a fresh nonce for every request and sends HMAC headers", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ apartments: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ apartments: [] }), { status: 200 }));
    const nonceFactory = vi.fn().mockReturnValueOnce("nonce-one").mockReturnValueOnce("nonce-two");
    const client = createSmoobuClient({
      apiKey: "usr_live_abc123",
      apiSecret: "test_secret",
      fetchImpl,
      nonceFactory,
      timestampFactory: () => "2026-04-01T12:00:00.000Z"
    });

    await client.getApartments();
    await client.getApartments();

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0][1]?.headers).toMatchObject({
      "X-API-Key": "usr_live_abc123",
      "X-Timestamp": "2026-04-01T12:00:00.000Z",
      "X-Nonce": "nonce-one"
    });
    expect(fetchImpl.mock.calls[1][1]?.headers).toMatchObject({
      "X-Nonce": "nonce-two"
    });
    expect(fetchImpl.mock.calls[0][1]?.headers["X-Signature"]).toEqual(expect.any(String));
  });
});
