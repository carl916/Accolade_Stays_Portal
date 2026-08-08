import "server-only";

import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { createSmoobuClient, type SmoobuClient } from "./client";
import { markSmoobuBookingDeleted, upsertSmoobuBooking } from "./sync";

type Supabase = SupabaseClient<Database>;

const reservationActions = new Set(["newReservation", "updateReservation", "cancelReservation"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hashPayload(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function numberFromUnknown(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function extractReservationIdFromWebhook(payload: unknown) {
  if (!isRecord(payload) || !isRecord(payload.data)) {
    return null;
  }

  if (isRecord(payload.data.booking)) {
    const bookingId = numberFromUnknown(payload.data.booking.id);
    if (bookingId !== null) {
      return bookingId;
    }
  }

  const directId = numberFromUnknown(payload.data.id);
  if (directId !== null) {
    return directId;
  }

  return null;
}

export function validateSmoobuWebhookPayload(payload: unknown) {
  if (!isRecord(payload)) {
    return { valid: false as const, error: "Webhook payload must be an object." };
  }

  const action = typeof payload.action === "string" ? payload.action : "";
  if (!action) {
    return { valid: false as const, error: "Webhook action is missing." };
  }

  if (!isRecord(payload.data)) {
    return { valid: false as const, error: "Webhook data is missing." };
  }

  return {
    valid: true as const,
    action,
    smoobuUserId: numberFromUnknown(payload.user),
    reservationId: extractReservationIdFromWebhook(payload)
  };
}

export async function processSmoobuWebhook(input: {
  payload: unknown;
  supabase?: Supabase;
  client?: SmoobuClient;
}) {
  const supabase = input.supabase ?? createSupabaseServiceRoleClient();
  const validation = validateSmoobuWebhookPayload(input.payload);
  const payloadHash = hashPayload(input.payload);

  if (!validation.valid) {
    await supabase.from("smoobu_webhook_events").insert({
      action: "invalid",
      payload_hash: payloadHash,
      status: "ignored",
      error_message: validation.error
    } as never);

    return { status: "ignored" as const, reason: validation.error };
  }

  const existing = await supabase
    .from("smoobu_webhook_events")
    .select("id,status")
    .eq("payload_hash", payloadHash)
    .maybeSingle();

  if (existing.data) {
    return { status: "duplicate" as const };
  }

  const { data: eventData } = await supabase
    .from("smoobu_webhook_events")
    .insert({
      action: validation.action,
      smoobu_user_id: validation.smoobuUserId,
      smoobu_reservation_id: validation.reservationId,
      payload_hash: payloadHash,
      status: "received"
    } as never)
    .select("id")
    .single();
  const eventId = (eventData as { id: string } | null)?.id;

  try {
    if (reservationActions.has(validation.action)) {
      if (!validation.reservationId) {
        throw new Error("Reservation webhook did not include a reservation id.");
      }

      const client = input.client ?? createSmoobuClient();
      const authoritativeBooking = await client.getReservation(validation.reservationId);
      await upsertSmoobuBooking({
        supabase,
        payload: authoritativeBooking.data
      });
    } else if (validation.action === "deleteReservation") {
      if (!validation.reservationId) {
        throw new Error("Delete webhook did not include a reservation id.");
      }

      await markSmoobuBookingDeleted({
        supabase,
        reservationId: validation.reservationId
      });
    } else if (validation.action === "newMessage" && validation.reservationId) {
      await supabase
        .from("smoobu_bookings")
        .update({
          messages_last_webhook_at: new Date().toISOString(),
          messages_need_refresh: true
        } as never)
        .eq("smoobu_reservation_id", validation.reservationId);
    }

    if (eventId) {
      await supabase
        .from("smoobu_webhook_events")
        .update({
          status: "processed",
          processed_at: new Date().toISOString()
        } as never)
        .eq("id", eventId);
    }

    return { status: "processed" as const };
  } catch (error) {
    if (eventId) {
      await supabase
        .from("smoobu_webhook_events")
        .update({
          status: "failed",
          processed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : "Webhook processing failed."
        } as never)
        .eq("id", eventId);
    }

    throw error;
  }
}
