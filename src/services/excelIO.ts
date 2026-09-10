import ExcelJS from "exceljs";
import type { AnniversaryEntry, AnniversaryInput } from "../models/anniversary";

const HEADERS = ["Tên người mất", "Sự kiện", "Ngày âm", "Tháng âm", "Tháng nhuận", "Năm mất (dương lịch)", "Mô tả"];

const LEAP_TRUTHY = new Set(["có", "co", "x", "true", "1", "yes", "nhuận", "nhuan"]);

type Row = [string, string, number, number, string, number | "", string];

async function buildWorkbookBlob(rows: Row[]): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Ngày giỗ");
  sheet.addRow(HEADERS);
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) {
    sheet.addRow(row);
  }
  sheet.columns.forEach((col) => {
    col.width = 22;
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function entryToRow(entry: Pick<AnniversaryEntry, "personName" | "eventLabel" | "lunarDay" | "lunarMonth" | "lunarIsLeap" | "deathYear" | "description">): Row {
  return [
    entry.personName,
    entry.eventLabel,
    entry.lunarDay,
    entry.lunarMonth,
    entry.lunarIsLeap ? "Có" : "",
    entry.deathYear ?? "",
    entry.description,
  ];
}

export function exportEntriesToExcel(entries: AnniversaryEntry[]): Promise<Blob> {
  return buildWorkbookBlob(entries.map(entryToRow));
}

export function buildSampleTemplate(): Promise<Blob> {
  return buildWorkbookBlob([
    entryToRow({
      personName: "Ông Nguyễn Văn A",
      eventLabel: "Giỗ Ông Nội",
      lunarDay: 25,
      lunarMonth: 12,
      lunarIsLeap: false,
      deathYear: 2017,
      description: "Mất lúc 22h ngày 22/11/2017",
    }),
    entryToRow({
      personName: "Bà Trần Thị B",
      eventLabel: "Giỗ Bà Ngoại",
      lunarDay: 9,
      lunarMonth: 2,
      lunarIsLeap: false,
      deathYear: 2023,
      description: "Mất lúc 6h sáng ngày 28/02/2023",
    }),
  ]);
}

export interface ImportResult {
  entries: AnniversaryInput[];
  notes: string[];
}

function findHeaderIndex(headerRow: unknown[], name: string): number {
  return headerRow.findIndex((h) => String(h ?? "").trim().toLowerCase() === name.toLowerCase());
}

function cellText(row: ExcelJS.Row, idx: number): string {
  if (idx === -1) return "";
  return String(row.getCell(idx).value ?? "").trim();
}

export async function parseExcelFile(file: File): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { entries: [], notes: ["Không tìm thấy sheet nào trong file."] };
  }

  const headerRow = (sheet.getRow(1).values as unknown[]) ?? [];
  const idxName = findHeaderIndex(headerRow, "Tên người mất");
  const idxEvent = findHeaderIndex(headerRow, "Sự kiện");
  const idxLunarDay = findHeaderIndex(headerRow, "Ngày âm");
  const idxLunarMonth = findHeaderIndex(headerRow, "Tháng âm");
  const idxLeap = findHeaderIndex(headerRow, "Tháng nhuận");
  const idxDeathYear = findHeaderIndex(headerRow, "Năm mất (dương lịch)");
  const idxDesc = findHeaderIndex(headerRow, "Mô tả");
  // Back-compat with the original desktop app's file (Ngày tháng d/M, Sự kiện, Mô tả).
  const idxLegacyDate = findHeaderIndex(headerRow, "Ngày tháng");

  if (idxEvent === -1 || (idxLunarDay === -1 && idxLegacyDate === -1)) {
    return {
      entries: [],
      notes: [
        'Không nhận diện được cột dữ liệu. File cần có cột "Sự kiện" và ("Ngày âm" + "Tháng âm", hoặc "Ngày tháng" kiểu d/M).',
      ],
    };
  }

  const entries: AnniversaryInput[] = [];
  const notes: string[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const eventLabel = cellText(row, idxEvent);
    const personName = cellText(row, idxName);
    const description = cellText(row, idxDesc);

    let lunarDay: number | null = null;
    let lunarMonth: number | null = null;
    if (idxLunarDay !== -1 && idxLunarMonth !== -1) {
      lunarDay = Number(cellText(row, idxLunarDay));
      lunarMonth = Number(cellText(row, idxLunarMonth));
    } else if (idxLegacyDate !== -1) {
      const match = cellText(row, idxLegacyDate).match(/^(\d{1,2})\/(\d{1,2})$/);
      if (match) {
        lunarDay = Number(match[1]);
        lunarMonth = Number(match[2]);
      }
    }

    const isBlankRow = !eventLabel && !personName && lunarDay === null;
    if (isBlankRow) return;

    if (
      !eventLabel ||
      lunarDay === null ||
      lunarMonth === null ||
      !Number.isInteger(lunarDay) ||
      !Number.isInteger(lunarMonth) ||
      lunarDay < 1 ||
      lunarDay > 30 ||
      lunarMonth < 1 ||
      lunarMonth > 12
    ) {
      notes.push(`Dòng ${rowNumber}: thiếu hoặc sai ngày/tháng âm lịch, đã bỏ qua.`);
      return;
    }

    const lunarIsLeap = LEAP_TRUTHY.has(cellText(row, idxLeap).toLowerCase());
    const deathYearText = cellText(row, idxDeathYear);
    const deathYearNum = deathYearText ? Number(deathYearText) : NaN;
    const deathYear = Number.isInteger(deathYearNum) ? deathYearNum : null;

    if (!personName) {
      notes.push(`Dòng ${rowNumber}: không có tên người mất, đã để trống - có thể bổ sung sau bằng nút "Sửa".`);
    }

    entries.push({ personName, eventLabel, lunarDay, lunarMonth, lunarIsLeap, deathYear, description });
  });

  return { entries, notes };
}
