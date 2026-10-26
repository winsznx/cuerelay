import { DateTime } from "luxon";
import { ScheduleValidationError } from "./types.js";

export interface ResolvedLocalTime {
  utcInstant: string;
  isAmbiguous: boolean;
  isNonExistent: boolean;
  offsetMinutes: number;
  abbreviation: string;
}

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/**
 * Resolves an event-local wall-clock minute-of-day against an IANA timezone and
 * event date, per PRD §6.7. `minuteOfDay` may exceed 1439 to represent a time
 * after local midnight on the following calendar day.
 *
 * The intended wall-clock reading (year/month/day/hour/minute) is tested
 * against both candidate UTC offsets the zone uses that year (standard and
 * daylight): zero matches means the reading never occurred (DST "spring
 * forward" gap), two matches means it occurred twice (DST "fall back"
 * repeat). Per PRD §6.3 rule 5, both cases are flagged rather than silently
 * guessed — in particular, duration arithmetic that would silently skip over
 * a gap is deliberately avoided. `disambiguateOffsetMinutes` lets a caller
 * who has already resolved the ambiguity through the UI pin the exact
 * instant.
 */
export function resolveLocalTime(
  eventDateLocal: string,
  timezone: string,
  minuteOfDay: number,
  options?: { disambiguateOffsetMinutes?: number },
): ResolvedLocalTime {
  const eventDate = DateTime.fromISO(eventDateLocal, { zone: timezone });
  if (!eventDate.isValid) {
    throw new ScheduleValidationError(
      "VALIDATION_ERROR",
      `Invalid event date or IANA timezone: ${eventDateLocal} / ${timezone} (${eventDate.invalidReason})`,
    );
  }

  // Date-only arithmetic to find the target calendar day; safe from DST since days don't shift.
  const dayOffset = Math.floor(minuteOfDay / 1440);
  const minuteWithinDay = minuteOfDay - dayOffset * 1440;
  const calendarDay = eventDate.plus({ days: dayOffset });

  const intended: WallClock = {
    year: calendarDay.year,
    month: calendarDay.month,
    day: calendarDay.day,
    hour: Math.floor(minuteWithinDay / 60),
    minute: minuteWithinDay % 60,
  };

  const janOffset = DateTime.fromObject({ year: intended.year, month: 1, day: 1 }, { zone: timezone }).offset;
  const julOffset = DateTime.fromObject({ year: intended.year, month: 7, day: 1 }, { zone: timezone }).offset;
  const candidateOffsets = [...new Set([janOffset, julOffset])];

  const matchingOffsets = candidateOffsets.filter((offsetMinutes) => reproducesWallClock(intended, offsetMinutes, timezone));

  const isNonExistent = matchingOffsets.length === 0;
  const isAmbiguous = matchingOffsets.length > 1;

  const chosenOffset =
    options?.disambiguateOffsetMinutes ?? matchingOffsets[0] ?? candidateOffsets[0]!;

  const resolvedUtc = utcFromWallClock(intended, chosenOffset);
  const resolvedLocal = resolvedUtc.setZone(timezone);

  return {
    utcInstant: resolvedUtc.toISO() ?? "",
    isAmbiguous,
    isNonExistent,
    offsetMinutes: chosenOffset,
    abbreviation: resolvedLocal.offsetNameShort ?? "",
  };
}

function utcFromWallClock(wallClock: WallClock, offsetMinutes: number): DateTime {
  return DateTime.utc(wallClock.year, wallClock.month, wallClock.day, wallClock.hour, wallClock.minute).minus({
    minutes: offsetMinutes,
  });
}

/** Does interpreting this intended wall-clock reading under `offsetMinutes` round-trip back to the same reading in `timezone`? */
function reproducesWallClock(wallClock: WallClock, offsetMinutes: number, timezone: string): boolean {
  const backToLocal = utcFromWallClock(wallClock, offsetMinutes).setZone(timezone);
  return (
    backToLocal.year === wallClock.year &&
    backToLocal.month === wallClock.month &&
    backToLocal.day === wallClock.day &&
    backToLocal.hour === wallClock.hour &&
    backToLocal.minute === wallClock.minute
  );
}
