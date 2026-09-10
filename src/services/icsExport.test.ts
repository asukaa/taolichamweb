import { describe, expect, it } from "vitest";
import { buildIcsCalendar } from "./icsExport";

function parseIcs(content: string): Record<string, string>[] {
  const events: Record<string, string>[] = [];
  let current: Record<string, string> | null = null;
  for (const line of content.split("\r\n")) {
    if (line === "BEGIN:VEVENT") {
      current = {};
    } else if (line === "END:VEVENT") {
      if (current) events.push(current);
      current = null;
    } else if (current) {
      const idx = line.indexOf(":");
      if (idx !== -1) current[line.slice(0, idx)] = line.slice(idx + 1);
    }
  }
  return events;
}

describe("buildIcsCalendar", () => {
  it("starts at 00:00:00 and ends at 23:59:00 on the same calendar day", () => {
    const ics = buildIcsCalendar([
      { summary: "Giỗ Ông Nội(25/12)", description: "test", date: { year: 2026, month: 2, day: 12 } },
    ]);
    const [event] = parseIcs(ics);

    expect(event.DTSTART).toBe("20260212T000000");
    expect(event.DTEND).toBe("20260212T235900");
    // No trailing Z / TZID: floating local time, same literal wall-clock time everywhere.
    expect(event.DTSTART).not.toMatch(/Z$/);
    expect(event.DTEND).not.toMatch(/Z$/);
  });

  it("keeps DTSTART and DTEND on the same day for a variety of dates, including month/year boundaries", () => {
    const dates = [
      { year: 2026, month: 1, day: 1 },
      { year: 2026, month: 2, day: 28 },
      { year: 2028, month: 2, day: 29 }, // leap day
      { year: 2026, month: 12, day: 31 },
    ];
    const ics = buildIcsCalendar(dates.map((date) => ({ summary: "x", description: "", date })));
    for (const event of parseIcs(ics)) {
      const startDay = event.DTSTART.slice(0, 8);
      const endDay = event.DTEND.slice(0, 8);
      expect(endDay).toBe(startDay);
      expect(event.DTSTART.slice(9)).toBe("000000");
      expect(event.DTEND.slice(9)).toBe("235900");
    }
  });

  it("escapes commas, semicolons, and backslashes in text fields", () => {
    const ics = buildIcsCalendar([
      {
        summary: "Giỗ; Ông A, B",
        description: "mất lúc 14h, ngày 02/12; ghi chú\\đặc biệt",
        date: { year: 2026, month: 1, day: 1 },
      },
    ]);
    const [event] = parseIcs(ics);
    expect(event.SUMMARY).toBe("Giỗ\\; Ông A\\, B");
    expect(event.DESCRIPTION).toBe("mất lúc 14h\\, ngày 02/12\\; ghi chú\\\\đặc biệt");
  });
});
