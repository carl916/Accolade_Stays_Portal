import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { extractReservationIdFromWebhook, validateSmoobuWebhookPayload } from "./webhooks";

describe("Smoobu webhook validation", () => {
  it("rejects invalid webhook shapes", () => {
    expect(validateSmoobuWebhookPayload({ action: "newReservation" })).toMatchObject({
      valid: false
    });
  });

  it("extracts reservation ids from reservation webhooks", () => {
    expect(
      extractReservationIdFromWebhook({
        action: "updateReservation",
        data: {
          id: 292
        }
      })
    ).toBe(292);
  });

  it("extracts booking ids from message webhooks", () => {
    expect(
      validateSmoobuWebhookPayload({
        action: "newMessage",
        user: 7,
        data: {
          id: 1234,
          sender: "guest",
          booking: {
            id: 234
          }
        }
      })
    ).toMatchObject({
      valid: true,
      action: "newMessage",
      reservationId: 234
    });
  });
});
