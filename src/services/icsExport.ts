import { solarToLunar, type SolarDate } from "../core/lunarCalendar";
import { getLunarHolidayName } from "../core/lunarHolidays";
import { downloadBlob } from "./download";

export interface IcsEventInput {
  summary: string;
  description: string;
  date: SolarDate;
  /** Plain event name for the reminder text (e.g. "Giỗ Ông Nội"), without the lunar date suffix. Falls back to summary. */
  alarmLabel?: string;
}

function pad(n: number, width: number = 2): string {
  return String(n).padStart(width, "0");
}

function formatDateStamp(d: SolarDate): string {
  return `${d.year}${pad(d.month)}${pad(d.day)}`;
}

/** Floating local time (no Z / TZID), so it always reads as that literal wall-clock time. */
function formatLocalDateTime(d: SolarDate, hour: number, minute: number, second: number): string {
  return `${formatDateStamp(d)}T${pad(hour)}${pad(minute)}${pad(second)}`;
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

function nowAsUtcStamp(): string {
  const now = new Date();
  return (
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T` +
    `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`
  );
}

/** ISO 8601 negative duration, e.g. days=1,hours=0,minutes=0 -> "-P1D" (1 day before, at 00:00 of that day). */
function formatAlarmTrigger(days: number, hours: number, minutes: number): string {
  let trigger = "-P";
  if (days > 0) trigger += `${days}D`;
  if (hours > 0 || minutes > 0) {
    trigger += "T";
    if (hours > 0) trigger += `${hours}H`;
    if (minutes > 0) trigger += `${minutes}M`;
  }
  return trigger;
}

/** e.g. days=1,hours=0,minutes=0 -> "1 ngày"; days=0,hours=2,minutes=30 -> "2 giờ 30 phút". */
function formatAlarmPhrase(days: number, hours: number, minutes: number): string {
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ngày`);
  if (hours > 0) parts.push(`${hours} giờ`);
  if (minutes > 0) parts.push(`${minutes} phút`);
  return parts.join(" ");
}

export interface AlarmOptions {
  days: number;
  hours: number;
  minutes: number;
}

export function buildIcsCalendar(events: IcsEventInput[], alarm?: AlarmOptions): string {
  const dtstamp = nowAsUtcStamp();
  const hasAlarm = !!alarm && (alarm.days > 0 || alarm.hours > 0 || alarm.minutes > 0);
  const lines = ["BEGIN:VCALENDAR", "PRODID:-//taolicham.web//lunar anniversaries//VI", "VERSION:2.0"];
  for (const event of events) {
    const day = event.date;
    lines.push(
      "BEGIN:VEVENT",
      `DESCRIPTION:${escapeText(event.description)}`,
      `DTEND:${formatLocalDateTime(day, 23, 59, 0)}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${formatLocalDateTime(day, 0, 0, 0)}`,
      "RRULE:FREQ=DAILY;COUNT=1",
      "SEQUENCE:0",
      `SUMMARY:${escapeText(event.summary)}`,
      `UID:${crypto.randomUUID()}`,
    );
    if (hasAlarm) {
      const { days, hours, minutes } = alarm!;
      const reminderText = `${formatAlarmPhrase(days, hours, minutes)} nữa là tới ${event.alarmLabel ?? event.summary}`;
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeText(reminderText)}`,
        `TRIGGER:${formatAlarmTrigger(days, hours, minutes)}`,
        "END:VALARM",
      );
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

function daysInSolarYear(year: number): number {
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return isLeap ? 366 : 365;
}

/**
 * One all-day event per day of the given solar year, titled with the lunar
 * date ("ngày/tháng", plus "(nhuận)" for a leap month) and the holiday name
 * when that day is one of the well-known lunar festivals - a full-year lunar
 * date overlay a user can import into any calendar app.
 */
export function buildLunarYearEvents(year: number): IcsEventInput[] {
  const totalDays = daysInSolarYear(year);
  const events: IcsEventInput[] = [];
  for (let dayOfYear = 0; dayOfYear < totalDays; dayOfYear++) {
    const jsDate = new Date(Date.UTC(year, 0, 1 + dayOfYear));
    const date: SolarDate = { year: jsDate.getUTCFullYear(), month: jsDate.getUTCMonth() + 1, day: jsDate.getUTCDate() };
    const lunar = solarToLunar(date);
    const holidayName = getLunarHolidayName(lunar);
    const lunarLabel = `${lunar.day}/${lunar.month}${lunar.isLeap ? " (nhuận)" : ""}`;
    events.push({
      summary: holidayName ? `${lunarLabel} - ${holidayName}` : lunarLabel,
      description: "",
      date,
    });
  }
  return events;
}

export function downloadIcsFile(filename: string, content: string): void {
  downloadBlob(filename, new Blob([content], { type: "text/calendar;charset=utf-8" }));
}
