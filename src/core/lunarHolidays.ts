export interface LunarHoliday {
  day: number;
  month: number;
  name: string;
}

// Well-known Vietnamese holidays/festivals fixed by lunar date. All fall on the
// regular (non-leap) month - a leap-month day of the same day/month is not the
// holiday again.
export const LUNAR_HOLIDAYS: LunarHoliday[] = [
  { day: 1, month: 1, name: "Tết Nguyên Đán" },
  { day: 15, month: 1, name: "Tết Nguyên Tiêu" },
  { day: 3, month: 3, name: "Tết Hàn Thực" },
  { day: 10, month: 3, name: "Giỗ Tổ Hùng Vương" },
  { day: 15, month: 4, name: "Lễ Phật Đản" },
  { day: 5, month: 5, name: "Tết Đoan Ngọ" },
  { day: 15, month: 7, name: "Lễ Vu Lan (Rằm tháng Bảy)" },
  { day: 15, month: 8, name: "Tết Trung Thu" },
  { day: 23, month: 12, name: "Tết Ông Công Ông Táo" },
];

export function getLunarHolidayName(lunar: { day: number; month: number; isLeap: boolean }): string | null {
  if (lunar.isLeap) return null;
  return LUNAR_HOLIDAYS.find((h) => h.day === lunar.day && h.month === lunar.month)?.name ?? null;
}
