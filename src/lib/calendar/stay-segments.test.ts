import { describe, expect, it } from "vitest";
import { addCalendarDays, buildStayCalendarWeeks, parseCalendarDate, toCalendarDateValue } from "./stay-segments";

describe("stay calendar segments", () => {
  it("renders a one-night stay from arrival midday to checkout midday", () => {
    const [week] = buildStayCalendarWeeks({
      weekStarts: ["2026-08-10"],
      bookings: [
        {
          id: "booking-1",
          propertyId: "brahms",
          arrivalDate: "2026-08-10",
          departureDate: "2026-08-11"
        }
      ]
    });

    expect(week.segments).toMatchObject([
      {
        bookingId: "booking-1",
        startHalfColumn: 2,
        endHalfColumn: 4,
        startsAtBookingStart: true,
        endsAtBookingEnd: true
      }
    ]);
  });

  it("splits stays cleanly across Monday-start calendar weeks", () => {
    const weeks = buildStayCalendarWeeks({
      weekStarts: ["2026-08-10", "2026-08-17"],
      bookings: [
        {
          id: "booking-1",
          propertyId: "rossini",
          arrivalDate: "2026-08-15",
          departureDate: "2026-08-19"
        }
      ]
    });

    expect(weeks[0].segments).toMatchObject([
      {
        startHalfColumn: 12,
        endHalfColumn: 15,
        startsAtBookingStart: true,
        endsAtBookingEnd: false,
        continuesAfter: true
      }
    ]);
    expect(weeks[1].segments).toMatchObject([
      {
        startHalfColumn: 1,
        endHalfColumn: 6,
        startsAtBookingStart: false,
        endsAtBookingEnd: true,
        continuesBefore: true
      }
    ]);
  });

  it("clips stays that begin before the visible calendar range", () => {
    const [week] = buildStayCalendarWeeks({
      weekStarts: ["2026-08-03"],
      bookings: [
        {
          id: "booking-1",
          propertyId: "st-andrews",
          arrivalDate: "2026-07-30",
          departureDate: "2026-08-05"
        }
      ]
    });

    expect(week.segments).toMatchObject([
      {
        startHalfColumn: 1,
        endHalfColumn: 6,
        startsAtBookingStart: false,
        endsAtBookingEnd: true,
        continuesBefore: true
      }
    ]);
  });

  it("meets same-day checkout and check-in bookings at the date midpoint", () => {
    const [week] = buildStayCalendarWeeks({
      weekStarts: ["2026-08-10"],
      bookings: [
        {
          id: "booking-a",
          propertyId: "brahms",
          arrivalDate: "2026-08-10",
          departureDate: "2026-08-13"
        },
        {
          id: "booking-b",
          propertyId: "brahms",
          arrivalDate: "2026-08-13",
          departureDate: "2026-08-16"
        }
      ]
    });

    expect(week.segments).toHaveLength(2);
    expect(week.segments[0]).toMatchObject({ bookingId: "booking-a", startHalfColumn: 2, endHalfColumn: 8 });
    expect(week.segments[1]).toMatchObject({ bookingId: "booking-b", startHalfColumn: 8, endHalfColumn: 14 });
  });

  it("formats local calendar dates without UTC timezone shifting", () => {
    const date = addCalendarDays(parseCalendarDate("2026-03-29"), 1);

    expect(toCalendarDateValue(date)).toBe("2026-03-30");
  });
});
