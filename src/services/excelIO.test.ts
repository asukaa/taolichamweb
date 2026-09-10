import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { buildSampleTemplate, exportEntriesToExcel, parseExcelFile } from "./excelIO";
import type { AnniversaryEntry } from "../models/anniversary";

function toFile(blob: Blob, name: string): File {
  return new File([blob], name, { type: blob.type });
}

const SAMPLE_ENTRIES: AnniversaryEntry[] = [
  {
    id: "1",
    personName: "Ông Nguyễn Văn A",
    eventLabel: "Giỗ Ông Nội",
    lunarDay: 25,
    lunarMonth: 12,
    lunarIsLeap: false,
    deathYear: 2017,
    description: "Mất lúc 22h ngày 22/11/2017",
  },
  {
    id: "2",
    personName: "Bà Trần Thị B",
    eventLabel: "Giỗ Bà Ngoại",
    lunarDay: 9,
    lunarMonth: 2,
    lunarIsLeap: true,
    deathYear: null,
    description: "",
  },
];

describe("excelIO round-trip", () => {
  it("exports entries to an .xlsx file and parses them back identically", async () => {
    const blob = await exportEntriesToExcel(SAMPLE_ENTRIES);
    const { entries, notes } = await parseExcelFile(toFile(blob, "ngay-gio.xlsx"));

    expect(notes).toEqual([]);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      personName: "Ông Nguyễn Văn A",
      eventLabel: "Giỗ Ông Nội",
      lunarDay: 25,
      lunarMonth: 12,
      lunarIsLeap: false,
      deathYear: 2017,
      description: "Mất lúc 22h ngày 22/11/2017",
    });
    expect(entries[1]).toEqual({
      personName: "Bà Trần Thị B",
      eventLabel: "Giỗ Bà Ngoại",
      lunarDay: 9,
      lunarMonth: 2,
      lunarIsLeap: true,
      deathYear: null,
      description: "",
    });
  });

  it("the downloadable sample template itself parses back with no errors", async () => {
    const blob = await buildSampleTemplate();
    const { entries, notes } = await parseExcelFile(toFile(blob, "mau.xlsx"));

    expect(notes).toEqual([]);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.eventLabel).not.toBe("");
      expect(entry.lunarDay).toBeGreaterThanOrEqual(1);
      expect(entry.lunarMonth).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("excelIO legacy format compatibility", () => {
  it("imports the original desktop app's 3-column file (Ngày tháng d/M, Sự kiện, Mô tả)", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sheet1");
    sheet.addRow(["Ngày tháng", "Sự kiện", "Mô tả"]);
    sheet.addRow(["25/12", "Giỗ Ông Nội", "Ông Phạm Đình Thảo đêm 22/11/2017"]);
    sheet.addRow(["9/2", "Giỗ Bà Ngoại", "Bà Lê Thị Diên sáng 28/02/2023"]);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

    const { entries, notes } = await parseExcelFile(toFile(blob, "Ngay gio.xlsx"));

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ eventLabel: "Giỗ Ông Nội", lunarDay: 25, lunarMonth: 12, lunarIsLeap: false });
    expect(entries[1]).toMatchObject({ eventLabel: "Giỗ Bà Ngoại", lunarDay: 9, lunarMonth: 2, lunarIsLeap: false });
    // No "Tên người mất" column in the legacy format, so it should be flagged, not guessed.
    expect(notes.some((n) => n.includes("tên người mất"))).toBe(true);
  });

  it("skips malformed rows with a note instead of crashing", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sheet1");
    sheet.addRow(["Tên người mất", "Sự kiện", "Ngày âm", "Tháng âm", "Tháng nhuận", "Năm mất (dương lịch)", "Mô tả"]);
    sheet.addRow(["Ông C", "Giỗ Ông C", 40, 12, "", "", ""]); // invalid lunar day
    sheet.addRow(["Bà D", "Giỗ Bà D", 15, 6, "", "", ""]); // valid
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

    const { entries, notes } = await parseExcelFile(toFile(blob, "test.xlsx"));

    expect(entries).toHaveLength(1);
    expect(entries[0].personName).toBe("Bà D");
    expect(notes.some((n) => n.includes("Dòng 2"))).toBe(true);
  });
});
