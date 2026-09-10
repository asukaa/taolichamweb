import type { SolarDate } from "../core/lunarCalendar";
import { downloadBlob } from "./download";

export interface IcsEventInput {
  summary: string;
  description: string;
  date: SolarDate;
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

export function buildIcsCalendar(events: IcsEventInput[]): string {
  const dtstamp = nowAsUtcStamp();
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
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

export function downloadIcsFile(filename: string, content: string): void {
  downloadBlob(filename, new Blob([content], { type: "text/calendar;charset=utf-8" }));
}
