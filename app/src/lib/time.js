/** Minute-of-day (0-2879, may exceed 1439 for after-midnight) to a 12-hour label like "5:05 PM" or "1:00 AM +1". */
export function formatMinute(minute) {
  const dayOffset = Math.floor(minute / 1440);
  const minuteOfDay = minute - dayOffset * 1440;
  const hour24 = Math.floor(minuteOfDay / 60);
  const min = minuteOfDay % 60;
  const period = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const label = `${hour12}:${String(min).padStart(2, '0')} ${period}`;
  return dayOffset > 0 ? `${label} +${dayOffset}d` : label;
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatDelta(deltaMinutes) {
  if (deltaMinutes === 0) return 'unchanged';
  const sign = deltaMinutes > 0 ? '+' : '-';
  return `${sign}${Math.abs(deltaMinutes)}m`;
}

/** Parses an "HH:MM AM/PM" string (as produced by a <input type="time"> paired with a period toggle,
 * or typed directly) into a minute-of-day. Returns null if unparseable. */
export function parseTimeToMinute(hour, minute, period) {
  const h = Number(hour);
  const m = Number(minute);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 1 || h > 12 || m < 0 || m > 59) return null;
  const hour24 = period === 'AM' ? (h === 12 ? 0 : h) : h === 12 ? 12 : h + 12;
  return hour24 * 60 + m;
}

export function minuteToHourMinutePeriod(minute) {
  const minuteOfDay = ((minute % 1440) + 1440) % 1440;
  const hour24 = Math.floor(minuteOfDay / 60);
  const m = minuteOfDay % 60;
  const period = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour: hour12, minute: m, period };
}
