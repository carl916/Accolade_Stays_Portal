import { describe, expect, it } from "vitest";
import { normaliseSmoobuBooking } from "./normalise";

const smoobuBookingPayload = {
  id: 292,
  "reference-id": "KRZUZ2XY",
  type: "reservation",
  arrival: "2026-08-10",
  departure: "2026-08-13",
  "created-at": "2026-08-01 12:30",
  modifiedAt: "2026-08-02 13:45",
  apartment: {
    id: 38,
    name: "Brahms Road"
  },
  channel: {
    id: 74,
    name: "Airbnb"
  },
  "guest-name": "Jane Smith",
  email: "jane@example.com",
  phone: "+440000000000",
  adults: 2,
  children: 1,
  "check-in": "16:00",
  "check-out": "10:00",
  notice: "Arriving by train.",
  price: 444,
  "price-paid": "No",
  prepayment: 44,
  "prepayment-paid": "Yes",
  deposit: null,
  "deposit-paid": "No",
  language: "en",
  "guest-app-url": "https://guest.smoobu.com/example",
  "is-blocked-booking": false,
  guestId: 1234,
  priceElements: [
    {
      id: 10,
      type: "cleaningFee",
      name: "Cleaning fee",
      amount: 30,
      quantity: null,
      tax: null,
      currencyCode: "GBP",
      sortOrder: 4,
      priceIncludedInId: null
    }
  ]
};

describe("normaliseSmoobuBooking", () => {
  it("normalises Smoobu reservation fields for local storage", () => {
    const booking = normaliseSmoobuBooking(smoobuBookingPayload);

    expect(booking.smoobuReservationId).toBe(292);
    expect(booking.smoobuApartmentId).toBe(38);
    expect(booking.arrivalDate).toBe("2026-08-10");
    expect(booking.departureDate).toBe("2026-08-13");
    expect(booking.checkInTime).toBe("16:00");
    expect(booking.checkOutTime).toBe("10:00");
    expect(booking.pricePaid).toBe("No");
    expect(booking.prepaymentPaid).toBe("Yes");
    expect(booking.isBlockedBooking).toBe(false);
    expect(booking.isCancelled).toBe(false);
    expect(booking.priceElements).toHaveLength(1);
    expect(booking.priceElements[0].type).toBe("cleaningFee");
  });

  it("marks cancellation booking types without deleting the booking", () => {
    const booking = normaliseSmoobuBooking({
      ...smoobuBookingPayload,
      type: "cancellation"
    });

    expect(booking.isCancelled).toBe(true);
  });

  it("preserves blocked booking state for filtering out of the guest calendar", () => {
    const booking = normaliseSmoobuBooking({
      ...smoobuBookingPayload,
      "is-blocked-booking": "YES"
    });

    expect(booking.isBlockedBooking).toBe(true);
  });
});
