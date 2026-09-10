import { describe, expect, it } from "vitest";
import {
  getIsoWeekNumber,
  getWeekdayName,
  isPossibleLeapMonth,
  lunarToSolar,
  resolveLeapFromDeathYear,
  solarToLunar,
} from "./lunarCalendar";
import { projectAnniversaryYears } from "./anniversaryProjection";

// Ground truth taken from the original app's output file
// "Ngay gio2026-2041.ics" (Ngay gio.xlsx rows -> generated solar dates).
describe("lunarToSolar matches the original app's output", () => {
  it("25/12 (Giỗ Ông Nội) lands on 12/02/2026 when read from lunar year 2025", () => {
    const solar = lunarToSolar({ year: 2025, month: 12, day: 25, isLeap: false });
    expect(solar).toEqual({ year: 2026, month: 2, day: 12 });
  });

  it("9/2 (Giỗ Bà Ngoại) lands on 27/03/2026 when read from lunar year 2026", () => {
    const solar = lunarToSolar({ year: 2026, month: 2, day: 9, isLeap: false });
    expect(solar).toEqual({ year: 2026, month: 3, day: 27 });
  });

  it("25/6 (Giỗ Bà Nội) lands on 07/08/2026 when read from lunar year 2026", () => {
    const solar = lunarToSolar({ year: 2026, month: 6, day: 25, isLeap: false });
    expect(solar).toEqual({ year: 2026, month: 8, day: 7 });
  });

  it("13/10 (Giỗ Ông Ngoại) lands on 21/11/2026 when read from lunar year 2026", () => {
    const solar = lunarToSolar({ year: 2026, month: 10, day: 13, isLeap: false });
    expect(solar).toEqual({ year: 2026, month: 11, day: 21 });
  });
});

describe("solarToLunar is the inverse of lunarToSolar", () => {
  it("round-trips a range of solar dates", () => {
    for (let year = 2020; year <= 2030; year++) {
      for (const [month, day] of [
        [1, 15],
        [4, 30],
        [7, 1],
        [9, 23],
        [12, 31],
      ]) {
        const solar = { year, month, day };
        const lunar = solarToLunar(solar);
        const roundTripped = lunarToSolar(lunar);
        expect(roundTripped).toEqual(solar);
      }
    }
  });
});

describe("isPossibleLeapMonth", () => {
  it("recognizes the well-known leap month of lunar year 2023 (nhuận tháng 2)", () => {
    expect(isPossibleLeapMonth(2023, 2)).toBe(true);
  });

  it("returns false for months that year has no leap occurrence of", () => {
    expect(isPossibleLeapMonth(2023, 3)).toBe(false);
    expect(isPossibleLeapMonth(2023, 12)).toBe(false);
  });

  it("agrees with lunarToSolar: true iff the leap variant actually converts", () => {
    for (let year = 2015; year <= 2035; year++) {
      for (let month = 1; month <= 12; month++) {
        const solar = lunarToSolar({ year, month, day: 1, isLeap: true });
        expect(isPossibleLeapMonth(year, month)).toBe(solar !== null);
      }
    }
  });

  it("months 1-10 of a given lunar year have at most one leap candidate", () => {
    for (let year = 2015; year <= 2035; year++) {
      const leapCandidates = Array.from({ length: 10 }, (_, i) => i + 1).filter((m) =>
        isPossibleLeapMonth(year, m),
      );
      expect(leapCandidates.length).toBeLessThanOrEqual(1);
    }
  });
});

describe("getWeekdayName", () => {
  it("matches known weekdays", () => {
    // 2026-02-12 is a Thursday, 2026-09-10 is a Thursday too (today, per system date).
    expect(getWeekdayName({ year: 2026, month: 2, day: 12 })).toBe("Thứ Năm");
    expect(getWeekdayName({ year: 2026, month: 9, day: 10 })).toBe("Thứ Năm");
    expect(getWeekdayName({ year: 2026, month: 2, day: 15 })).toBe("Chủ Nhật");
  });
});

describe("getIsoWeekNumber", () => {
  it("increases by exactly 1 every 7 days away from a year boundary", () => {
    const week1 = getIsoWeekNumber({ year: 2026, month: 3, day: 2 });
    const week2 = getIsoWeekNumber({ year: 2026, month: 3, day: 9 });
    const week3 = getIsoWeekNumber({ year: 2026, month: 3, day: 16 });
    expect(week2).toBe(week1 + 1);
    expect(week3).toBe(week1 + 2);
  });

  it("stays constant across one Monday-to-Sunday week", () => {
    const days = [2, 3, 4, 5, 6, 7, 8].map((day) => getIsoWeekNumber({ year: 2026, month: 3, day }));
    expect(new Set(days).size).toBe(1);
  });
});

describe("Vietnamese (UTC+7) lunar calendar vs Chinese (UTC+8)", () => {
  it("defaults to the Vietnamese time zone, which can disagree with the Chinese one on real dates", () => {
    // Documented historical divergence: 1984-06-01 is 3/5 âm lịch in Vietnam's
    // calendar but 2/5 in China's, because the new moon fell in the narrow
    // window between UTC+7 midnight and UTC+8 midnight for that lunar month.
    const vn = solarToLunar({ year: 1984, month: 6, day: 1 }); // default = UTC+7
    const cn = solarToLunar({ year: 1984, month: 6, day: 1 }, 8);
    expect(vn).toEqual({ year: 1984, month: 5, day: 3, isLeap: false });
    expect(cn).toEqual({ year: 1984, month: 5, day: 2, isLeap: false });
    expect(vn).not.toEqual(cn);
  });
});

describe("resolveLeapFromDeathYear", () => {
  it("is unambiguous when the death year has no leap occurrence of that month (25/12, died 2026)", () => {
    expect(resolveLeapFromDeathYear(25, 12, 2026)).toEqual({ invalid: false, ambiguous: false, isLeap: false });
  });

  it("is ambiguous when the death year actually has a leap version of that month (15/2, died 2023)", () => {
    // 2023 (Quý Mão) is the well-known "nhuận tháng 2" year: both a regular and
    // a leap 15/2 fall within solar year 2023, so the family must say which.
    expect(resolveLeapFromDeathYear(15, 2, 2023)).toEqual({ invalid: false, ambiguous: true, isLeap: false });
  });
});

describe("projectAnniversaryYears", () => {
  it("reproduces every 2026 occurrence from the original .ics for all four sample rows", () => {
    const cases = [
      { lunarDay: 25, lunarMonth: 12, expected: { year: 2026, month: 2, day: 12 } },
      { lunarDay: 9, lunarMonth: 2, expected: { year: 2026, month: 3, day: 27 } },
      { lunarDay: 25, lunarMonth: 6, expected: { year: 2026, month: 8, day: 7 } },
      { lunarDay: 13, lunarMonth: 10, expected: { year: 2026, month: 11, day: 21 } },
    ];
    for (const { lunarDay, lunarMonth, expected } of cases) {
      const occurrences = projectAnniversaryYears({ lunarDay, lunarMonth, lunarIsLeap: false }, 2026, 2026);
      expect(occurrences).toHaveLength(1);
      expect(occurrences[0].solar).toEqual(expected);
    }
  });

  it("produces exactly one occurrence per year over a multi-year range", () => {
    const occurrences = projectAnniversaryYears({ lunarDay: 25, lunarMonth: 12, lunarIsLeap: false }, 2026, 2041);
    expect(occurrences).toHaveLength(2041 - 2026 + 1);
    expect(occurrences.map((o) => o.year)).toEqual(
      Array.from({ length: 2041 - 2026 + 1 }, (_, i) => 2026 + i),
    );
  });
});
