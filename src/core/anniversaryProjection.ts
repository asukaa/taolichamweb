import { lunarToSolar, type SolarDate } from "./lunarCalendar";

export interface LunarAnniversary {
  lunarDay: number;
  lunarMonth: number;
  lunarIsLeap: boolean;
}

export interface YearlyOccurrence {
  year: number;
  solar: SolarDate;
}

/**
 * A recurring lunar-calendar anniversary (day/month, no fixed year) can land in
 * either the previous or next Gregorian year depending on the month. Rather than
 * hardcode that boundary, try the lunar years around the target Gregorian year
 * and keep whichever conversion actually lands in it.
 */
function projectOntoGregorianYear(anniversary: LunarAnniversary, targetYear: number): SolarDate | null {
  for (const lunarYear of [targetYear, targetYear - 1, targetYear + 1]) {
    const solar = lunarToSolar({
      year: lunarYear,
      month: anniversary.lunarMonth,
      day: anniversary.lunarDay,
      isLeap: anniversary.lunarIsLeap,
    });
    if (solar && solar.year === targetYear) {
      return solar;
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
    const solar = projectOntoGregorianYear(anniversary, year);
    if (solar) {
      occurrences.push({ year, solar });
    }
  }
  return occurrences;
}
