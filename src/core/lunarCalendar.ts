// Vietnamese lunar calendar conversion, based on the classic astronomical
// algorithm (Julian Day Number + new moon / sun longitude calculations)
// originally published by Ho Ngoc Duc and widely ported since. Vietnam's
// civil lunar calendar uses UTC+7 as its reference time zone.

export interface SolarDate {
  year: number;
  month: number; // 1-12
  day: number;
}

export interface LunarDate {
  year: number; // the lunar year the date belongs to (Tet of this year starts lunar month 1)
  month: number; // 1-12
  day: number;
  isLeap: boolean;
}

const VN_TIME_ZONE = 7;

const WEEKDAY_NAMES_VI = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

/** 0 = Chủ Nhật (Sunday) .. 6 = Thứ Bảy (Saturday), matching Date#getUTCDay(). */
export function getWeekdayIndex(solar: SolarDate): number {
  return new Date(Date.UTC(solar.year, solar.month - 1, solar.day)).getUTCDay();
}

export function getWeekdayName(solar: SolarDate): string {
  return WEEKDAY_NAMES_VI[getWeekdayIndex(solar)];
}

/** ISO 8601 week number (weeks start Monday; week 1 is the week containing the year's first Thursday). */
export function getIsoWeekNumber(solar: SolarDate): number {
  const date = new Date(Date.UTC(solar.year, solar.month - 1, solar.day));
  const isoWeekday = (date.getUTCDay() + 6) % 7; // 0 = Monday .. 6 = Sunday
  date.setUTCDate(date.getUTCDate() - isoWeekday + 3); // move to the Thursday of this week
  const isoYearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.floor((date.getTime() - isoYearStart.getTime()) / 86400000 / 7) + 1;
}

function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd =
    dd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;
  if (jd < 2299161) {
    jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
}

function jdToDate(jd: number): SolarDate {
  let a: number, b: number, c: number;
  if (jd > 2299160) {
    a = jd + 32044;
    b = Math.floor((4 * a + 3) / 146097);
    c = a - Math.floor((b * 146097) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = b * 100 + d - 4800 + Math.floor(m / 10);
  return { year, month, day };
}

function newMoon(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180;
  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);

  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;

  let c1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  c1 = c1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  c1 = c1 - 0.0004 * Math.sin(dr * 3 * Mpr);
  c1 = c1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  c1 = c1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
  c1 = c1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
  c1 = c1 + 0.001 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));

  let deltaT: number;
  if (T < -11) {
    deltaT = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
  } else {
    deltaT = -0.000278 + 0.000265 * T + 0.000262 * T2;
  }

  return jd1 + c1 - deltaT;
}

function sunLongitude(jdn: number): number {
  const T = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = Math.PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let dl = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  dl = dl + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
  let l = L0 + dl;
  l = l * dr;
  l = l - Math.PI * 2 * Math.floor(l / (Math.PI * 2));
  return l;
}

function getSunLongitudeMajorTerm(dayNumber: number, timeZone: number): number {
  return Math.floor((sunLongitude(dayNumber - 0.5 - timeZone / 24) / Math.PI) * 6);
}

function getNewMoonDay(k: number, timeZone: number): number {
  return Math.floor(newMoon(k) + 0.5 + timeZone / 24);
}

function getLunarMonth11(yy: number, timeZone: number): number {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = Math.floor(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitudeMajorTerm(nm, timeZone);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
}

function getLeapMonthOffset(a11: number, timeZone: number): number {
  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = getSunLongitudeMajorTerm(getNewMoonDay(k + 1, timeZone), timeZone);
  let i = 1;
  let arc = last;
  do {
    i++;
    last = arc;
    arc = getSunLongitudeMajorTerm(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);
  return i - 1;
}

export function solarToLunar(solar: SolarDate, timeZone: number = VN_TIME_ZONE): LunarDate {
  const dayNumber = jdFromDate(solar.day, solar.month, solar.year);
  const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, timeZone);
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, timeZone);
  }
  let a11 = getLunarMonth11(solar.year, timeZone);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = solar.year;
    a11 = getLunarMonth11(solar.year - 1, timeZone);
  } else {
    lunarYear = solar.year + 1;
    b11 = getLunarMonth11(solar.year + 1, timeZone);
  }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let isLeap = false;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapMonthOff = getLeapMonthOffset(a11, timeZone);
    if (diff >= leapMonthOff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthOff) {
        isLeap = true;
      }
    }
  }
  if (lunarMonth > 12) {
    lunarMonth -= 12;
  }
  if (lunarMonth >= 11 && diff < 4) {
    lunarYear -= 1;
  }
  return { year: lunarYear, month: lunarMonth, day: lunarDay, isLeap };
}

/** Returns null if the requested leap month does not exist in that lunar year. */
export function lunarToSolar(lunar: LunarDate, timeZone: number = VN_TIME_ZONE): SolarDate | null {
  let a11: number, b11: number;
  if (lunar.month < 11) {
    a11 = getLunarMonth11(lunar.year - 1, timeZone);
    b11 = getLunarMonth11(lunar.year, timeZone);
  } else {
    a11 = getLunarMonth11(lunar.year, timeZone);
    b11 = getLunarMonth11(lunar.year + 1, timeZone);
  }
  const k = Math.floor(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  let off = lunar.month - 11;
  if (off < 0) {
    off += 12;
  }
  if (b11 - a11 > 365) {
    const leapOff = getLeapMonthOffset(a11, timeZone);
    let leapMonth = leapOff - 2;
    if (leapMonth < 0) {
      leapMonth += 12;
    }
    if (lunar.isLeap && lunar.month !== leapMonth) {
      return null;
    } else if (lunar.isLeap || off >= leapOff) {
      off += 1;
    }
  } else if (lunar.isLeap) {
    // This lunar year has no leap month at all, so a leap occurrence can't exist.
    return null;
  }
  const monthStart = getNewMoonDay(k + off, timeZone);
  return jdToDate(monthStart + lunar.day - 1);
}

/**
 * Whether the given lunar year has a leap occurrence of the given month number
 * at all (i.e. that month is "doubled" that year). Lets the UI auto-determine
 * whether a recorded lunar day/month is unambiguously a regular month (no leap
 * occurrence exists that year, so it can't be the leap one) versus a case where
 * the user must say which of the two occurrences (regular or leap) they mean.
 */
export function isPossibleLeapMonth(
  lunarYear: number,
  lunarMonth: number,
  timeZone: number = VN_TIME_ZONE,
): boolean {
  return lunarToSolar({ year: lunarYear, month: lunarMonth, day: 1, isLeap: true }, timeZone) !== null;
}

/**
 * Given a recorded lunar day/month and the solar (Gregorian) year the death
 * happened in, works out whether that lunar month was necessarily the regular
 * occurrence, necessarily the leap occurrence, or genuinely ambiguous (that
 * year had both a regular and a leap version of the month, so only the family
 * can say which one it was).
 */
export interface LeapResolution {
  /** The day/month/year combination doesn't correspond to any real date. */
  invalid: boolean;
  /** Both a regular and a leap occurrence exist that year - can't auto-decide. */
  ambiguous: boolean;
  /** Only meaningful when neither invalid nor ambiguous. */
  isLeap: boolean;
}

const CAN_VI = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
const CHI_VI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];

/** "Can Chi" (Lục Thập Hoa Giáp / sexagenary cycle) name of the day, from the solar date. */
export function getDayCanChi(solar: SolarDate): string {
  const jd = jdFromDate(solar.day, solar.month, solar.year);
  return `${CAN_VI[(jd + 9) % 10]} ${CHI_VI[(jd + 1) % 12]}`;
}

/** Can Chi name of the lunar month (uses the lunar year/month, not the solar one). */
export function getMonthCanChi(lunar: Pick<LunarDate, "year" | "month">): string {
  return `${CAN_VI[(lunar.year * 12 + lunar.month + 3) % 10]} ${CHI_VI[(lunar.month + 1) % 12]}`;
}

/** Can Chi name of the lunar year. */
export function getYearCanChi(lunarYear: number): string {
  return `${CAN_VI[(lunarYear + 6) % 10]} ${CHI_VI[(lunarYear + 8) % 12]}`;
}

const SOLAR_TERM_NAMES_VI = [
  "Lập Xuân",
  "Vũ Thủy",
  "Kinh Trập",
  "Xuân Phân",
  "Thanh Minh",
  "Cốc Vũ",
  "Lập Hạ",
  "Tiểu Mãn",
  "Mang Chủng",
  "Hạ Chí",
  "Tiểu Thử",
  "Đại Thử",
  "Lập Thu",
  "Xử Thử",
  "Bạch Lộ",
  "Thu Phân",
  "Hàn Lộ",
  "Sương Giáng",
  "Lập Đông",
  "Tiểu Tuyết",
  "Đại Tuyết",
  "Đông Chí",
  "Tiểu Hàn",
  "Đại Hàn",
];

/** Index (0-23) of the current "tiết khí" (solar term), in the traditional order starting at Lập Xuân. */
export function getSolarTermIndex(solar: SolarDate, timeZone: number = VN_TIME_ZONE): number {
  const jd = jdFromDate(solar.day, solar.month, solar.year);
  const longitudeDegrees = (sunLongitude(jd - 0.5 - timeZone / 24) * 180) / Math.PI;
  return Math.floor((longitudeDegrees + 45) / 15) % 24;
}

export function getSolarTermName(solar: SolarDate, timeZone: number = VN_TIME_ZONE): string {
  return SOLAR_TERM_NAMES_VI[getSolarTermIndex(solar, timeZone)];
}

export function resolveLeapFromDeathYear(
  lunarDay: number,
  lunarMonth: number,
  solarDeathYear: number,
  timeZone: number = VN_TIME_ZONE,
): LeapResolution {
  const candidateLunarYears = [solarDeathYear, solarDeathYear - 1, solarDeathYear + 1];
  const nonLeapMatch = candidateLunarYears.some(
    (y) => lunarToSolar({ year: y, month: lunarMonth, day: lunarDay, isLeap: false }, timeZone)?.year === solarDeathYear,
  );
  const leapMatch = candidateLunarYears.some(
    (y) => lunarToSolar({ year: y, month: lunarMonth, day: lunarDay, isLeap: true }, timeZone)?.year === solarDeathYear,
  );
  if (!nonLeapMatch && !leapMatch) {
    return { invalid: true, ambiguous: false, isLeap: false };
  }
  if (nonLeapMatch && leapMatch) {
    return { invalid: false, ambiguous: true, isLeap: false };
  }
  return { invalid: false, ambiguous: false, isLeap: leapMatch };
}
