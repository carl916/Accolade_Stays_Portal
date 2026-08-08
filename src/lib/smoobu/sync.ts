import "server-only";

import { addDays, format, subDays } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/types";
import { createSmoobuClient, type SmoobuClient, type SmoobuRequestError } from "./client";
import { normaliseSmoobuBooking, type NormalisedSmoobuBooking } from "./normalise";

type Supabase = SupabaseClient<Database>;
type SmoobuBookingRow = Database["public"]["Tables"]["smoobu_bookings"]["Row"];
type SmoobuBookingInsert = Database["public"]["Tables"]["smoobu_bookings"]["Insert"];
type SmoobuBookingUpdate = Database["public"]["Tables"]["smoobu_bookings"]["Update"];
type SmoobuPriceElementInsert = Database["public"]["Tables"]["smoobu_booking_price_elements"]["Insert"];
type SmoobuSyncRunUpdate = Database["public"]["Tables"]["smoobu_sync_runs"]["Update"];

export type SmoobuSyncSummary = {
  created: number;
  updated: number;
  cancelled: number;
  failed: number;
};

export type SmoobuSyncRange = {
  from?: string;
  to?: string;
  modifiedFrom?: string;
  modifiedTo?: string;
};

export const defaultSmoobuInitialSyncWindow = {
  pastDays: 90,
  futureDays: 365
};

function todayIsoDate() {
  return format(new Date(), "yyyy-MM-dd");
}

function getDefaultDateRange() {
  const now = new Date();

  return {
    from: format(subDays(now, defaultSmoobuInitialSyncWindow.pastDays), "yyyy-MM-dd"),
    to: format(addDays(now, defaultSmoobuInitialSyncWindow.futureDays), "yyyy-MM-dd")
  };
}

function isRequestError(error: unknown): error is SmoobuRequestError {
  return typeof error === "object" && error !== null && "status" in error;
}

function getSafeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Smoobu synchronisation failed.";
}

async function getPropertyIdForApartment(supabase: Supabase, apartmentId: number) {
  const { data } = await supabase
    .from("smoobu_property_mappings")
    .select("property_id")
    .eq("provider", "smoobu")
    .eq("smoobu_apartment_id", apartmentId)
    .eq("is_active", true)
    .maybeSingle();
  const mapping = data as Pick<
    Database["public"]["Tables"]["smoobu_property_mappings"]["Row"],
    "property_id"
  > | null;

  return mapping?.property_id ?? null;
}

function toBookingInsert(booking: NormalisedSmoobuBooking, propertyId: string) {
  return {
    property_id: propertyId,
    smoobu_reservation_id: booking.smoobuReservationId,
    smoobu_reference_id: booking.smoobuReferenceId,
    smoobu_apartment_id: booking.smoobuApartmentId,
    smoobu_apartment_name: booking.smoobuApartmentName,
    smoobu_channel_id: booking.smoobuChannelId,
    channel_name: booking.channelName,
    booking_type: booking.bookingType,
    arrival_date: booking.arrivalDate,
    departure_date: booking.departureDate,
    check_in_time: booking.checkInTime,
    check_out_time: booking.checkOutTime,
    guest_name: booking.guestName,
    guest_email: booking.guestEmail,
    guest_phone: booking.guestPhone,
    adults: booking.adults,
    children: booking.children,
    guest_language: booking.guestLanguage,
    guest_id: booking.guestId,
    guest_app_url: booking.guestAppUrl,
    notice: booking.notice,
    is_blocked_booking: booking.isBlockedBooking,
    is_cancelled: booking.isCancelled,
    booking_price: booking.bookingPrice,
    price_paid: booking.pricePaid,
    prepayment: booking.prepayment,
    prepayment_paid: booking.prepaymentPaid,
    deposit: booking.deposit,
    deposit_paid: booking.depositPaid,
    smoobu_created_at: booking.smoobuCreatedAt,
    smoobu_modified_at: booking.smoobuModifiedAt,
    sync_status: booking.isCancelled ? "cancelled" : "synced",
    last_synced_at: new Date().toISOString(),
    last_sync_error: null,
    raw_payload: booking.rawPayload
  } satisfies SmoobuBookingInsert;
}

async function flagLinkedCleansForReview(input: {
  supabase: Supabase;
  bookingId: string;
  reason: string;
}) {
  const update = {
    booking_change_requires_review: true,
    booking_change_reason: input.reason
  } satisfies Database["public"]["Tables"]["cleaning_jobs"]["Update"];

  await input.supabase
    .from("cleaning_jobs")
    .update(update as never)
    .eq("smoobu_booking_id", input.bookingId)
    .neq("status", "cancelled");
}

async function upsertPriceElements(input: {
  supabase: Supabase;
  bookingId: string;
  booking: NormalisedSmoobuBooking;
}) {
  if (input.booking.priceElements.length === 0) {
    return;
  }

  const rows = input.booking.priceElements.map((element) => ({
    booking_id: input.bookingId,
    smoobu_price_element_id: element.smoobuPriceElementId,
    type: element.type,
    name: element.name,
    amount: element.amount,
    quantity: element.quantity,
    tax: element.tax,
    currency_code: element.currencyCode,
    sort_order: element.sortOrder,
    price_included_in_id: element.priceIncludedInId,
    raw_payload: element.rawPayload
  })) satisfies SmoobuPriceElementInsert[];

  await input.supabase
    .from("smoobu_booking_price_elements")
    .upsert(rows as never[], { onConflict: "booking_id,smoobu_price_element_id" });
}

export async function upsertSmoobuBooking(input: {
  supabase: Supabase;
  payload: unknown;
  deleted?: boolean;
}): Promise<"created" | "updated" | "cancelled"> {
  const booking = normaliseSmoobuBooking(input.payload);
  const propertyId = await getPropertyIdForApartment(input.supabase, booking.smoobuApartmentId);

  if (!propertyId) {
    throw new Error(`No active Accolade property mapping exists for Smoobu apartment ${booking.smoobuApartmentId}.`);
  }

  const { data: existingData } = await input.supabase
    .from("smoobu_bookings")
    .select("*")
    .eq("smoobu_reservation_id", booking.smoobuReservationId)
    .maybeSingle();
  const existing = existingData as SmoobuBookingRow | null;
  const row = toBookingInsert(booking, propertyId);
  const hasDateChanged =
    existing &&
    (existing.arrival_date !== booking.arrivalDate || existing.departure_date !== booking.departureDate);
  const status = input.deleted ? "deleted" : row.sync_status;
  const cleanReviewReason = input.deleted
    ? "Smoobu booking was deleted."
    : booking.isCancelled
      ? "Smoobu booking was cancelled."
      : hasDateChanged
        ? "Smoobu booking dates changed after a clean was linked."
        : existing?.clean_review_reason ?? null;

  const upsertRow = {
    ...row,
    sync_status: status,
    source_deleted_at: input.deleted ? new Date().toISOString() : null,
    previous_arrival_date: hasDateChanged ? existing?.arrival_date ?? null : existing?.previous_arrival_date ?? null,
    previous_departure_date: hasDateChanged ? existing?.departure_date ?? null : existing?.previous_departure_date ?? null,
    clean_review_required: Boolean(cleanReviewReason),
    clean_review_reason: cleanReviewReason
  } satisfies SmoobuBookingInsert | SmoobuBookingUpdate;
  const { data, error } = await input.supabase
    .from("smoobu_bookings")
    .upsert(upsertRow as never, { onConflict: "smoobu_reservation_id" })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Smoobu booking could not be stored.");
  }

  const bookingRow = data as Pick<SmoobuBookingRow, "id">;
  if (cleanReviewReason) {
    await flagLinkedCleansForReview({
      supabase: input.supabase,
      bookingId: bookingRow.id,
      reason: cleanReviewReason
    });
  }

  await upsertPriceElements({
    supabase: input.supabase,
    bookingId: bookingRow.id,
    booking
  });

  if (!existing) {
    return "created";
  }

  return booking.isCancelled || input.deleted ? "cancelled" : "updated";
}

async function fetchAllReservations(input: {
  client: SmoobuClient;
  range: SmoobuSyncRange;
}) {
  const bookings: unknown[] = [];
  let page = 1;
  let pageCount = 1;

  do {
    const response = await input.client.getReservations({
      from: input.range.from,
      to: input.range.to,
      modifiedFrom: input.range.modifiedFrom,
      modifiedTo: input.range.modifiedTo,
      showCancellation: true,
      excludeBlocked: false,
      includePriceElements: true,
      page,
      pageSize: 100
    });

    bookings.push(...(response.data.bookings ?? []));
    pageCount = response.data.page_count ?? page;
    page += 1;
  } while (page <= pageCount);

  return bookings;
}

async function startSyncRun(input: {
  supabase: Supabase;
  syncType: "initial" | "incremental" | "manual" | "webhook";
  range: SmoobuSyncRange;
  createdBy?: string | null;
}) {
  const { data, error } = await input.supabase
    .from("smoobu_sync_runs")
    .insert({
      sync_type: input.syncType,
      status: "running",
      date_from: input.range.from ?? null,
      date_to: input.range.to ?? null,
      modified_from: input.range.modifiedFrom ?? null,
      modified_to: input.range.modifiedTo ?? null,
      created_by: input.createdBy ?? null
    } as never)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Smoobu sync run could not be started.");
  }

  return (data as { id: string }).id;
}

async function completeSyncRun(input: {
  supabase: Supabase;
  syncRunId: string;
  summary: SmoobuSyncSummary;
}) {
  const now = new Date().toISOString();
  const update = {
    status: "completed",
    completed_at: now,
    records_created: input.summary.created,
    records_updated: input.summary.updated,
    records_cancelled: input.summary.cancelled,
    records_failed: input.summary.failed,
    last_successful_sync_at: now
  } satisfies SmoobuSyncRunUpdate;

  await input.supabase.from("smoobu_sync_runs").update(update as never).eq("id", input.syncRunId);
}

async function failSyncRun(input: {
  supabase: Supabase;
  syncRunId: string;
  summary: SmoobuSyncSummary;
  error: unknown;
}) {
  const update = {
    status: "failed",
    completed_at: new Date().toISOString(),
    records_created: input.summary.created,
    records_updated: input.summary.updated,
    records_cancelled: input.summary.cancelled,
    records_failed: input.summary.failed,
    error_message: getSafeErrorMessage(input.error)
  } satisfies SmoobuSyncRunUpdate;

  await input.supabase.from("smoobu_sync_runs").update(update as never).eq("id", input.syncRunId);
}

export async function syncSmoobuReservations(input: {
  syncType?: "initial" | "incremental" | "manual";
  range?: SmoobuSyncRange;
  createdBy?: string | null;
  supabase?: Supabase;
  client?: SmoobuClient;
}) {
  const supabase = input.supabase ?? createSupabaseServiceRoleClient();
  const client = input.client ?? createSmoobuClient();
  const range = input.range ?? getDefaultDateRange();
  const syncRunId = await startSyncRun({
    supabase,
    syncType: input.syncType ?? "manual",
    range,
    createdBy: input.createdBy
  });
  const summary: SmoobuSyncSummary = {
    created: 0,
    updated: 0,
    cancelled: 0,
    failed: 0
  };

  try {
    const bookings = await fetchAllReservations({ client, range });

    for (const payload of bookings) {
      try {
        const result = await upsertSmoobuBooking({ supabase, payload });
        summary[result] += 1;
      } catch {
        summary.failed += 1;
      }
    }

    await completeSyncRun({ supabase, syncRunId, summary });
    return summary;
  } catch (error) {
    if (isRequestError(error)) {
      summary.failed += 1;
    }

    await failSyncRun({ supabase, syncRunId, summary, error });
    throw error;
  }
}

export async function syncSmoobuReservationsModifiedSince(input: {
  since?: string | null;
  supabase?: Supabase;
  client?: SmoobuClient;
}) {
  const modifiedTo = todayIsoDate();
  const modifiedFrom = input.since ? format(new Date(input.since), "yyyy-MM-dd") : modifiedTo;

  return syncSmoobuReservations({
    syncType: "incremental",
    range: {
      modifiedFrom,
      modifiedTo
    },
    supabase: input.supabase,
    client: input.client
  });
}

export async function markSmoobuBookingDeleted(input: {
  supabase: Supabase;
  reservationId: number;
}) {
  const { data } = await input.supabase
    .from("smoobu_bookings")
    .select("id")
    .eq("smoobu_reservation_id", input.reservationId)
    .maybeSingle();
  const booking = data as Pick<SmoobuBookingRow, "id"> | null;

  if (!booking) {
    return;
  }

  await input.supabase
    .from("smoobu_bookings")
    .update({
      sync_status: "deleted",
      source_deleted_at: new Date().toISOString(),
      clean_review_required: true,
      clean_review_reason: "Smoobu booking was deleted."
    } as never)
    .eq("id", booking.id);
  await flagLinkedCleansForReview({
    supabase: input.supabase,
    bookingId: booking.id,
    reason: "Smoobu booking was deleted."
  });
}

export function serialiseSafeRawPayload(payload: unknown): Json {
  return (typeof payload === "object" && payload !== null ? payload : {}) as Json;
}
