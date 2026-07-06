// Availability slot math for booking calendars — Phase 2B version.
// The constants below are now just FALLBACKS; real values live in the
// tech_availability table and get passed into these functions.

export const DEFAULT_AVAILABILITY = {
  // [sun, mon, tue, wed, thu, fri, sat]
  days_of_week: [false, true, true, true, true, true, true],
  start_hour: 8,
  end_hour: 18,
  slot_minutes: 90,
};

export const BOOKING_WINDOW_DAYS = 21;

export function upcomingDays(availability = DEFAULT_AVAILABILITY) {
  const days = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < BOOKING_WINDOW_DAYS; i++) {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    if (availability.days_of_week[day.getDay()]) days.push(day);
  }
  return days;
}

// All open slot start times for a given day, minus conflicts with booked
// times and (for today) times already past. bookedTimes: array of ISO strings
// or of objects with scheduled_at/status.
export function slotsForDay(day, bookedTimes, availability = DEFAULT_AVAILABILITY) {
  const slots = [];
  const now = new Date();
  const slotMs = availability.slot_minutes * 60000;

  const start = new Date(day);
  start.setHours(availability.start_hour, 0, 0, 0);
  const end = new Date(day);
  end.setHours(availability.end_hour, 0, 0, 0);

  const busy = (bookedTimes ?? [])
    .filter((t) => (typeof t === "string" ? true : t.status === "upcoming"))
    .map((t) =>
      new Date(typeof t === "string" ? t : t.scheduled_at).getTime(),
    );

  for (let t = start.getTime(); t + slotMs <= end.getTime(); t += slotMs) {
    if (t <= now.getTime()) continue;
    if (busy.some((b) => Math.abs(b - t) < slotMs)) continue;
    slots.push(new Date(t));
  }
  return slots;
}

export function fmtTime(date) {
  return date
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .toLowerCase()
    .replace(" ", "");
}

export function fmtDayLong(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function fmtScheduledLabel(date) {
  return `${date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })} at ${date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(date) {
  return isSameDay(date, new Date());
}
