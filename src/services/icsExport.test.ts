import { describe, expect, it } from "vitest";
import { buildIcsCalendar, buildLunarYearEvents } from "./icsExport";

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

  it("adds no VALARM when no alarm option is given, or days/hours/minutes are all 0", () => {
    const oneEvent = [{ summary: "x", description: "", date: { year: 2026, month: 1, day: 1 } }];
    expect(buildIcsCalendar(oneEvent)).not.toContain("VALARM");
    expect(buildIcsCalendar(oneEvent, { days: 0, hours: 0, minutes: 0 })).not.toContain("VALARM");
  });

  it("adds a DISPLAY VALARM with the right TRIGGER duration for whole days, minutes, and combinations", () => {
    const oneEvent = [{ summary: "Giỗ Ông Nội", description: "", date: { year: 2026, month: 1, day: 1 } }];

    const oneDay = buildIcsCalendar(oneEvent, { days: 1, hours: 0, minutes: 0 });
    expect(oneDay).toContain("BEGIN:VALARM");
    expect(oneDay).toContain("ACTION:DISPLAY");
    expect(oneDay).toContain("TRIGGER:-P1D");
    expect(oneDay).toContain("END:VALARM");

    expect(buildIcsCalendar(oneEvent, { days: 0, hours: 0, minutes: 30 })).toContain("TRIGGER:-PT30M");
    expect(buildIcsCalendar(oneEvent, { days: 0, hours: 0, minutes: 15 })).toContain("TRIGGER:-PT15M");
    expect(buildIcsCalendar(oneEvent, { days: 2, hours: 0, minutes: 0 })).toContain("TRIGGER:-P2D");
    expect(buildIcsCalendar(oneEvent, { days: 2, hours: 3, minutes: 30 })).toContain("TRIGGER:-P2DT3H30M");
  });

  it("adds one VALARM per event, using each event's own summary as the alarm text when alarmLabel is absent", () => {
    const events = [
      { summary: "Giỗ A", description: "", date: { year: 2026, month: 1, day: 1 } },
      { summary: "Giỗ B", description: "", date: { year: 2026, month: 2, day: 2 } },
    ];
    const ics = buildIcsCalendar(events, { days: 0, hours: 1, minutes: 0 });
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2);
    expect(ics.match(/END:VALARM/g)).toHaveLength(2);
    expect(ics).toContain("TRIGGER:-PT1H");
  });

  it('phrases the VALARM description as "<time> nữa là tới <event name>"', () => {
    const oneEvent = [
      {
        summary: "Giỗ Ông Nội(25/12)",
        description: "",
        date: { year: 2026, month: 1, day: 1 },
        alarmLabel: "Giỗ Ông Nội",
      },
    ];

    expect(buildIcsCalendar(oneEvent, { days: 1, hours: 0, minutes: 0 })).toContain(
      "DESCRIPTION:1 ngày nữa là tới Giỗ Ông Nội",
    );
    expect(buildIcsCalendar(oneEvent, { days: 0, hours: 0, minutes: 15 })).toContain(
      "DESCRIPTION:15 phút nữa là tới Giỗ Ông Nội",
    );
    expect(buildIcsCalendar(oneEvent, { days: 2, hours: 3, minutes: 0 })).toContain(
      "DESCRIPTION:2 ngày 3 giờ nữa là tới Giỗ Ông Nội",
    );
  });

  it("falls back to the event summary for the reminder text when alarmLabel is not set", () => {
    const oneEvent = [{ summary: "Giỗ Ông Nội(25/12)", description: "", date: { year: 2026, month: 1, day: 1 } }];
    expect(buildIcsCalendar(oneEvent, { days: 1, hours: 0, minutes: 0 })).toContain(
      "DESCRIPTION:1 ngày nữa là tới Giỗ Ông Nội(25/12)",
    );
  });
});

describe("buildLunarYearEvents", () => {
  it("produces exactly one event per solar day, for both a normal and a leap year", () => {
    expect(buildLunarYearEvents(2026)).toHaveLength(365);
    expect(buildLunarYearEvents(2028)).toHaveLength(366); // 2028 is a leap solar year
  });

  it("covers every solar day of the year, in order, with no gaps or duplicates", () => {
    const events = buildLunarYearEvents(2026);
    expect(events[0].date).toEqual({ year: 2026, month: 1, day: 1 });
    expect(events.at(-1)!.date).toEqual({ year: 2026, month: 12, day: 31 });
    for (let i = 1; i < events.length; i++) {
      const prev = new Date(Date.UTC(events[i - 1].date.year, events[i - 1].date.month - 1, events[i - 1].date.day));
      const cur = new Date(Date.UTC(events[i].date.year, events[i].date.month - 1, events[i].date.day));
      expect(cur.getTime() - prev.getTime()).toBe(86400000);
    }
  });

  it('titles a plain day "ngày/tháng" and a holiday day "ngày/tháng - tên ngày lễ"', () => {
    const events = buildLunarYearEvents(2026);
    // 2026-02-12 is 25/12 (non-leap) per the earlier-verified ground truth - a plain day, no holiday.
    const plainDay = events.find((e) => e.date.year === 2026 && e.date.month === 2 && e.date.day === 12)!;
    expect(plainDay.summary).toBe("25/12");

    const tetDay = events.find((e) => e.summary.includes("Tết Nguyên Đán"))!;
    expect(tetDay.summary).toBe("1/1 - Tết Nguyên Đán");
  });
});
