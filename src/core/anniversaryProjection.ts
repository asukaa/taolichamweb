import { lunarToSolar, type SolarDate } from "./lunarCalendar";

export interface LunarAnniversary {
  lunarDay: number;
  lunarMonth: number;
  lunarIsLeap: boolean;
}

export interface YearlyOccurrence {
  year: number;
  solar: SolarDate;
  /**
   * Whether this particular year's occurrence actually landed on the leap
   * month. False both for non-leap anniversaries and for a leap anniversary
   * that fell back to the regular month (see projectOntoGregorianYear).
   */
  isLeap: boolean;
}

/**
 * A recurring lunar-calendar anniversary (day/month, no fixed year) can land in
 * either the previous or next Gregorian year depending on the month. Rather than
 * hardcode that boundary, try the lunar years around the target Gregorian year
 * and keep whichever conversion actually lands in it.
 *
 * Vietnamese giỗ custom requires an anniversary every single lunar year, but a
 * given month is only ever "leap" in roughly 1 out of every 3 lunar years (and
 * a specific month's leap occurrence can be ~19 years apart). So when the
 * recorded anniversary is a leap-month one, that exact leap occurrence is used
 * only in years where it exists; every other year falls back to the regular
 * (non-leap) occurrence of the same day/month, matching how families actually
 * observe it.
 */
function projectOntoGregorianYear(
  anniversary: LunarAnniversary,
  targetYear: number,
): { solar: SolarDate; isLeap: boolean } | null {
  for (const lunarYear of [targetYear, targetYear - 1, targetYear + 1]) {
    const solar = lunarToSolar({
      year: lunarYear,
      month: anniversary.lunarMonth,
      day: anniversary.lunarDay,
      isLeap: anniversary.lunarIsLeap,
    });
    if (solar && solar.year === targetYear) {
      return { solar, isLeap: anniversary.lunarIsLeap };
    }
  }
  if (!anniversary.lunarIsLeap) return null;
  for (const lunarYear of [targetYear, targetYear - 1, targetYear + 1]) {
    const solar = lunarToSolar({
      year: lunarYear,
      month: anniversary.lunarMonth,
      day: anniversary.lunarDay,
      isLeap: false,
    });
    if (solar && solar.year === targetYear) {
      return { solar, isLeap: false };
    }
  }
  return null;
}

export function projectAnniversaryYears(
  anniversary: LunarAnniversary,
  fromYear: number,
  toYear: number,
): YearlyOccurrence[] {
  const occurrences: YearlyOccurrence[] = [];
  for (let year = fromYear; year <= toYear; year++) {
    const result = projectOntoGregorianYear(anniversary, year);
    if (result) {
      occurrences.push({ year, solar: result.solar, isLeap: result.isLeap });
    }
  }
  return occurrences;
}
