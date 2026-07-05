// Availability slot math for booking calendars.
// Phase 2A: constants below are the defaults. Phase 2B moves these
// into a tech_availability table and both calendars read from there.

export const WORK_START_HOUR = 8; // 8:00 am
export const WORK_END_HOUR = 18; // 6:00 pm
export const SLOT_MINUTES = 90; // measure + drive time
export const BOOKING_WINDOW_DAYS = 21; // how far ahead the date strip runs
// Days techs work, 0 = Sunday … 6 = Saturday. Sundays off by default.
export const WORK_DAYS = [1, 2, 3, 4, 5, 6];

export function upcomingDays() {
  const days = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < BOOKING_WINDOW_DAYS; i++) {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    if (WORK_DAYS.includes(day.getDay())) days.push(day);
  }
  return days;
}

// All slot start times for a given day, minus conflicts with booked
// appointments and (for today) times already in the past.
export function slotsForDay(day, bookedAppointments) {
  const slots = [];
  const now = new Date();
  const start = new Date(day);
  start.setHours(WORK_START_HOUR, 0, 0, 0);
  const end = new Date(day);
  end.setHours(WORK_END_HOUR, 0, 0, 0);

  const busy = bookedAppointments
    .filter((a) => a.status === "upcoming")
    .map((a) => new Date(a.scheduled_at).getTime());

  for (
    let t = start.getTime();
    t + SLOT_MINUTES * 60000 <= end.getTime();
    t += SLOT_MINUTES * 60000
  ) {
    if (t <= now.getTime()) continue;
    const conflict = busy.some(
      (b) => Math.abs(b - t) < SLOT_MINUTES * 60000,
    );
    if (!conflict) slots.push(new Date(t));
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
