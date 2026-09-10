import { describe, expect, it } from "vitest";
import { getLunarHolidayName, LUNAR_HOLIDAYS } from "./lunarHolidays";

describe("getLunarHolidayName", () => {
  it("recognizes every configured holiday on its exact lunar date", () => {
    for (const holiday of LUNAR_HOLIDAYS) {
      expect(getLunarHolidayName({ day: holiday.day, month: holiday.month, isLeap: false })).toBe(holiday.name);
    }
  });

  it("returns null for an ordinary lunar date", () => {
    expect(getLunarHolidayName({ day: 20, month: 6, isLeap: false })).toBeNull();
  });

  it("does not match on the leap-month occurrence of the same day/month", () => {
    expect(getLunarHolidayName({ day: 1, month: 1, isLeap: true })).toBeNull();
    expect(getLunarHolidayName({ day: 15, month: 8, isLeap: true })).toBeNull();
  });

  it("includes all the holidays explicitly requested", () => {
    const names = LUNAR_HOLIDAYS.map((h) => h.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "Tết Nguyên Đán",
        "Tết Nguyên Tiêu",
        "Lễ Vu Lan (Rằm tháng Bảy)",
        "Tết Đoan Ngọ",
        "Giỗ Tổ Hùng Vương",
        "Tết Trung Thu",
        "Tết Ông Công Ông Táo",
        "Lễ Phật Đản",
      ]),
    );
  });
});
