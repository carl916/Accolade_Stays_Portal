export type StaySegmentBooking = {
  id: string;
  propertyId: string;
  arrivalDate: string;
  departureDate: string;
};

export type StayCalendarSegment = {
  bookingId: string;
  propertyId: string;
  weekStart: string;
  startDate: string;
  endDate: string;
  startHalfColumn: number;
  endHalfColumn: number;
  startsAtBookingStart: boolean;
  endsAtBookingEnd: boolean;
  continuesBefore: boolean;
  continuesAfter: boolean;
};

export type StayCalendarWeek = {
  weekStart: string;
  segments: StayCalendarSegment[];
};

const millisecondsPerDay = 24 * 60 * 60 * 1000;

export function parseCalendarDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    throw new Error(`Invalid calendar date: ${value}`);
  }

  const [, year, month, day] = match;

  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function toCalendarDateValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function addCalendarDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function dayNumber(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / millisecondsPerDay;
}

function compareCalendarDates(left: Date, right: Date) {
  return dayNumber(left) - dayNumber(right);
}

function getMiddayGridLine(date: Date, weekStart: Date) {
  return compareCalendarDates(date, weekStart) * 2 + 2;
}

export function buildStayCalendarWeeks(args: {
  bookings: StaySegmentBooking[];
  weekStarts: string[];
}): StayCalendarWeek[] {
  const weeks = args.weekStarts.map((weekStartValue) => ({
    weekStart: weekStartValue,
    weekStartDate: parseCalendarDate(weekStartValue),
    segments: [] as StayCalendarSegment[]
  }));

  for (const booking of args.bookings) {
    const bookingStart = parseCalendarDate(booking.arrivalDate);
    const bookingEnd = parseCalendarDate(booking.departureDate);

    if (compareCalendarDates(bookingEnd, bookingStart) <= 0) {
      continue;
    }

    for (const week of weeks) {
      const rawStartHalfColumn = getMiddayGridLine(bookingStart, week.weekStartDate);
      const rawEndHalfColumn = getMiddayGridLine(bookingEnd, week.weekStartDate);
      const startHalfColumn = Math.max(1, rawStartHalfColumn);
      const endHalfColumn = Math.min(15, rawEndHalfColumn);

      if (endHalfColumn <= startHalfColumn) {
        continue;
      }

      week.segments.push({
        bookingId: booking.id,
        propertyId: booking.propertyId,
        weekStart: week.weekStart,
        startDate: toCalendarDateValue(bookingStart),
        endDate: toCalendarDateValue(bookingEnd),
        startHalfColumn,
        endHalfColumn,
        startsAtBookingStart: rawStartHalfColumn >= 1 && rawStartHalfColumn <= 15,
        endsAtBookingEnd: rawEndHalfColumn >= 1 && rawEndHalfColumn <= 15,
        continuesBefore: rawStartHalfColumn < 1,
        continuesAfter: rawEndHalfColumn > 15
      });
    }
  }

  return weeks.map((week) => {
    const segments = [...week.segments].sort((left, right) => {
      if (left.propertyId !== right.propertyId) {
        return left.propertyId.localeCompare(right.propertyId);
      }

      if (left.startHalfColumn !== right.startHalfColumn) {
        return left.startHalfColumn - right.startHalfColumn;
      }

      if (left.endHalfColumn !== right.endHalfColumn) {
        return right.endHalfColumn - left.endHalfColumn;
      }

      return left.bookingId.localeCompare(right.bookingId);
    });

    return {
      weekStart: week.weekStart,
      segments
    };
  });
}
