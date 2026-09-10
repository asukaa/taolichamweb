export interface AnniversaryEntry {
  id: string;
  personName: string;
  eventLabel: string;
  lunarDay: number;
  lunarMonth: number;
  lunarIsLeap: boolean;
  /** Solar (Gregorian) year of death, if known - lets the app auto-detect lunarIsLeap. */
  deathYear: number | null;
  description: string;
}

export type AnniversaryInput = Omit<AnniversaryEntry, "id">;
