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
  endDateExclusive: string;
  startColumn: number;
  endColumn: number;
  lane: number;
  startsAtBookingStart: boolean;
  endsAtBookingEnd: boolean;
  continuesBefore: boolean;
  continuesAfter: boolean;
};

export type StayCalendarWeek = {
  weekStart: string;
  segments: StayCalendarSegment[];
  laneCount: number;
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

function maxCalendarDate(left: Date, right: Date) {
  return compareCalendarDates(left, right) >= 0 ? left : right;
}

function minCalendarDate(left: Date, right: Date) {
  return compareCalendarDates(left, right) <= 0 ? left : right;
}

function isSameCalendarDate(left: Date, right: Date) {
  return compareCalendarDates(left, right) === 0;
}

function getStartColumn(date: Date, weekStart: Date) {
  return compareCalendarDates(date, weekStart) + 1;
}

export function buildStayCalendarWeeks(args: {
  bookings: StaySegmentBooking[];
  weekStarts: string[];
}): StayCalendarWeek[] {
  const weeks = args.weekStarts.map((weekStartValue) => ({
    weekStart: weekStartValue,
    weekStartDate: parseCalendarDate(weekStartValue),
    segmentDrafts: [] as Omit<StayCalendarSegment, "lane">[]
  }));

  for (const booking of args.bookings) {
    const bookingStart = parseCalendarDate(booking.arrivalDate);
    const bookingEndExclusive = parseCalendarDate(booking.departureDate);

    if (compareCalendarDates(bookingEndExclusive, bookingStart) <= 0) {
      continue;
    }

    for (const week of weeks) {
      const weekEndExclusive = addCalendarDays(week.weekStartDate, 7);
      const segmentStart = maxCalendarDate(bookingStart, week.weekStartDate);
      const segmentEndExclusive = minCalendarDate(bookingEndExclusive, weekEndExclusive);

      if (compareCalendarDates(segmentEndExclusive, segmentStart) <= 0) {
        continue;
      }

      week.segmentDrafts.push({
        bookingId: booking.id,
        propertyId: booking.propertyId,
        weekStart: week.weekStart,
        startDate: toCalendarDateValue(segmentStart),
        endDateExclusive: toCalendarDateValue(segmentEndExclusive),
        startColumn: getStartColumn(segmentStart, week.weekStartDate),
        endColumn: getStartColumn(segmentEndExclusive, week.weekStartDate),
        startsAtBookingStart: isSameCalendarDate(segmentStart, bookingStart),
        endsAtBookingEnd: isSameCalendarDate(segmentEndExclusive, bookingEndExclusive),
        continuesBefore: compareCalendarDates(segmentStart, bookingStart) > 0,
        continuesAfter: compareCalendarDates(segmentEndExclusive, bookingEndExclusive) < 0
      });
    }
  }

  return weeks.map((week) => {
    const sortedSegments = [...week.segmentDrafts].sort((left, right) => {
      if (left.startColumn !== right.startColumn) {
        return left.startColumn - right.startColumn;
      }

      if (left.endColumn !== right.endColumn) {
        return right.endColumn - left.endColumn;
      }

      return left.bookingId.localeCompare(right.bookingId);
    });
    const laneEndColumns: number[] = [];
    const segments = sortedSegments.map((segment) => {
      const openLane = laneEndColumns.findIndex((endColumn) => endColumn < segment.startColumn);
      const lane = openLane === -1 ? laneEndColumns.length : openLane;
      laneEndColumns[lane] = segment.endColumn;

      return { ...segment, lane };
    });

    return {
      weekStart: week.weekStart,
      segments,
      laneCount: laneEndColumns.length
    };
  });
}
