import { describe, expect, it } from "vitest";
import { addCalendarDays, buildStayCalendarWeeks, parseCalendarDate, toCalendarDateValue } from "./stay-segments";

describe("stay calendar segments", () => {
  it("keeps checkout day as the exclusive end of a one-night stay", () => {
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
        startColumn: 1,
        endColumn: 2,
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
        startColumn: 6,
        endColumn: 8,
        startsAtBookingStart: true,
        endsAtBookingEnd: false,
        continuesAfter: true
      }
    ]);
    expect(weeks[1].segments).toMatchObject([
      {
        startColumn: 1,
        endColumn: 3,
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
        startColumn: 1,
        endColumn: 3,
        startsAtBookingStart: false,
        endsAtBookingEnd: true,
        continuesBefore: true
      }
    ]);
  });

  it("does not visually merge same-day checkout and check-in bookings into one lane", () => {
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
    expect(week.segments[0]).toMatchObject({ bookingId: "booking-a", startColumn: 1, endColumn: 4, lane: 0 });
    expect(week.segments[1]).toMatchObject({ bookingId: "booking-b", startColumn: 4, endColumn: 7, lane: 1 });
  });

  it("formats local calendar dates without UTC timezone shifting", () => {
    const date = addCalendarDays(parseCalendarDate("2026-03-29"), 1);

    expect(toCalendarDateValue(date)).toBe("2026-03-30");
  });
});
