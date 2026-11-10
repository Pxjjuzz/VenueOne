const IST = "Asia/Kolkata";

export const IST_OFFSET = "+05:30";

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function istDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function istTimeKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("hour")}:${get("minute")}`;
}

export function todayIstDateKey(now = new Date()): string {
  return istDateKey(now);
}

export function currentIstMonth(now = new Date()): string {
  return istDateKey(now).slice(0, 7);
}

/**
 * Reads the clock for server render entry points. Pages that need "now" call
 * this instead of an impure global directly, which keeps the compiler purity
 * check meaningful inside components.
 */
export function nowMs(): number {
  return Date.now();
}

export function isoDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isoMonthKey(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

export function isValidDateKey(value: string): boolean {
  if (!isoDateKey(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function weekdayOf(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function istDateTime(dateKey: string, time: string): Date {
  const normalized = time.length === 5 ? `${time}:00` : time;
  return new Date(`${dateKey}T${normalized}${IST_OFFSET}`);
}

export function monthRange(monthKey: string): { start: Date; end: Date; days: number } {
  const [year, month] = monthKey.split("-").map(Number);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return {
    start: new Date(`${monthKey}-01T00:00:00${IST_OFFSET}`),
    end: new Date(`${nextYear}-${pad2(nextMonth)}-01T00:00:00${IST_OFFSET}`),
    days: new Date(Date.UTC(year, month, 0)).getUTCDate(),
  };
}

export function datesInMonth(monthKey: string): string[] {
  const { days } = monthRange(monthKey);
  return Array.from({ length: days }, (_, index) => `${monthKey}-${pad2(index + 1)}`);
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}`;
}

export function formatIstDate(
  value: Date | string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-IN", { timeZone: IST, ...options }).format(date);
}

export function formatIstDateLong(value: Date | string): string {
  return formatIstDate(value, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatIstTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .toLowerCase();
}

export function formatIstDateTime(value: Date | string): string {
  return `${formatIstDate(value)} · ${formatIstTime(value)}`;
}

export function formatIstMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1, 12));
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatTimeRange(start: Date | string, end: Date | string): string {
  return `${formatIstTime(start)} – ${formatIstTime(end)}`;
}

export function hoursUntil(target: Date, now = new Date()): number {
  return (target.getTime() - now.getTime()) / 3_600_000;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000);
}

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function isHourAligned(time: string): boolean {
  return /^([01]\d|2[0-3]):00$/.test(time);
}

export function minutesToTime(minutes: number): string {
  return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
}

export function isPastDate(dateKey: string, now = new Date()): boolean {
  return dateKey < istDateKey(now);
}

export function countdownLabel(target: Date, now = new Date()): string {
  const milliseconds = target.getTime() - now.getTime();
  if (milliseconds <= 0) return "Expired";
  const totalMinutes = Math.ceil(milliseconds / 60_000);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}
