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

function addDays(d: SolarDate, days: number): SolarDate {
  const jsDate = new Date(Date.UTC(d.year, d.month - 1, d.day + days));
  return { year: jsDate.getUTCFullYear(), month: jsDate.getUTCMonth() + 1, day: jsDate.getUTCDate() };
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
    const start = event.date;
    const end = addDays(start, 1);
    lines.push(
      "BEGIN:VEVENT",
      `DESCRIPTION:${escapeText(event.description)}`,
      `DTEND;VALUE=DATE:${formatDateStamp(end)}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${formatDateStamp(start)}`,
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
