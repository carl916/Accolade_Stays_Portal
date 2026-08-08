import type { Json } from "@/lib/supabase/types";

export type NormalisedSmoobuBooking = {
  smoobuReservationId: number;
  smoobuReferenceId: string | null;
  smoobuApartmentId: number;
  smoobuApartmentName: string;
  smoobuChannelId: number | null;
  channelName: string | null;
  bookingType: string;
  arrivalDate: string;
  departureDate: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  adults: number | null;
  children: number | null;
  guestLanguage: string | null;
  guestId: number | null;
  guestAppUrl: string | null;
  notice: string | null;
  isBlockedBooking: boolean;
  isCancelled: boolean;
  bookingPrice: number | null;
  pricePaid: string | null;
  prepayment: number | null;
  prepaymentPaid: string | null;
  deposit: number | null;
  depositPaid: string | null;
  smoobuCreatedAt: string | null;
  smoobuModifiedAt: string | null;
  priceElements: NormalisedSmoobuPriceElement[];
  rawPayload: Json;
};

export type NormalisedSmoobuPriceElement = {
  smoobuPriceElementId: number;
  type: string | null;
  name: string | null;
  amount: number | null;
  quantity: number | null;
  tax: number | null;
  currencyCode: string | null;
  sortOrder: number | null;
  priceIncludedInId: number | null;
  rawPayload: Json;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return null;
}

function numberField(record: Record<string, unknown>, key: string) {
  const value = record[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function booleanField(record: Record<string, unknown>, key: string) {
  const value = record[key];

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return ["yes", "true", "1"].includes(value.trim().toLowerCase());
  }

  if (typeof value === "number") {
    return value === 1;
  }

  return false;
}

function dateField(record: Record<string, unknown>, key: string) {
  const value = stringField(record, key);

  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Smoobu booking is missing a valid ${key}.`);
  }

  return value;
}

function timeField(record: Record<string, unknown>, key: string) {
  const value = stringField(record, key);

  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return null;
  }

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function timestampField(record: Record<string, unknown>, key: string) {
  const value = stringField(record, key);

  if (!value) {
    return null;
  }

  const isoValue = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(isoValue);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function nestedRecord(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return isRecord(value) ? value : {};
}

function normalisePriceElement(value: unknown): NormalisedSmoobuPriceElement | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = numberField(value, "id");
  if (id === null) {
    return null;
  }

  return {
    smoobuPriceElementId: id,
    type: stringField(value, "type"),
    name: stringField(value, "name"),
    amount: numberField(value, "amount"),
    quantity: numberField(value, "quantity"),
    tax: numberField(value, "tax"),
    currencyCode: stringField(value, "currencyCode"),
    sortOrder: numberField(value, "sortOrder"),
    priceIncludedInId: numberField(value, "priceIncludedInId"),
    rawPayload: value as Json
  };
}

export function normaliseSmoobuBooking(payload: unknown): NormalisedSmoobuBooking {
  if (!isRecord(payload)) {
    throw new Error("Smoobu booking payload must be an object.");
  }

  const reservationId = numberField(payload, "id");
  const apartment = nestedRecord(payload, "apartment");
  const apartmentId = numberField(apartment, "id");

  if (reservationId === null) {
    throw new Error("Smoobu booking is missing an id.");
  }

  if (apartmentId === null) {
    throw new Error("Smoobu booking is missing an apartment id.");
  }

  const channel = nestedRecord(payload, "channel");
  const priceElements = Array.isArray(payload.priceElements)
    ? payload.priceElements.map(normalisePriceElement).filter((item): item is NormalisedSmoobuPriceElement => Boolean(item))
    : [];
  const bookingType = stringField(payload, "type") ?? "";

  return {
    smoobuReservationId: reservationId,
    smoobuReferenceId: stringField(payload, "reference-id"),
    smoobuApartmentId: apartmentId,
    smoobuApartmentName: stringField(apartment, "name") ?? `Apartment ${apartmentId}`,
    smoobuChannelId: numberField(channel, "id"),
    channelName: stringField(channel, "name"),
    bookingType,
    arrivalDate: dateField(payload, "arrival"),
    departureDate: dateField(payload, "departure"),
    checkInTime: timeField(payload, "check-in"),
    checkOutTime: timeField(payload, "check-out"),
    guestName: stringField(payload, "guest-name") ?? "",
    guestEmail: stringField(payload, "email"),
    guestPhone: stringField(payload, "phone"),
    adults: numberField(payload, "adults"),
    children: numberField(payload, "children"),
    guestLanguage: stringField(payload, "language"),
    guestId: numberField(payload, "guestId"),
    guestAppUrl: stringField(payload, "guest-app-url"),
    notice: stringField(payload, "notice"),
    isBlockedBooking: booleanField(payload, "is-blocked-booking"),
    isCancelled: bookingType.toLowerCase().includes("cancellation"),
    bookingPrice: numberField(payload, "price"),
    pricePaid: stringField(payload, "price-paid"),
    prepayment: numberField(payload, "prepayment"),
    prepaymentPaid: stringField(payload, "prepayment-paid"),
    deposit: numberField(payload, "deposit"),
    depositPaid: stringField(payload, "deposit-paid"),
    smoobuCreatedAt: timestampField(payload, "created-at"),
    smoobuModifiedAt: timestampField(payload, "modifiedAt"),
    priceElements,
    rawPayload: payload as Json
  };
}
