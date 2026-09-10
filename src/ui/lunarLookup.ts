import {
  getDayCanChi,
  getIsoWeekNumber,
  getMonthCanChi,
  getSolarTermName,
  getWeekdayName,
  getYearCanChi,
  solarToLunar,
} from "../core/lunarCalendar";
import { getLunarHolidayName } from "../core/lunarHolidays";
import { buildIcsCalendar, buildLunarYearEvents, downloadIcsFile } from "../services/icsExport";
import { escapeHtml } from "./escapeHtml";

interface SelectedDate {
  year: number;
  month: number;
  day: number;
}

const WEEKDAY_HEADERS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTH_MIN_YEAR = 1900;
const MONTH_MAX_YEAR = 2200;

let viewYear: number | undefined;
let viewMonth: number | undefined;
let selectedDate: SelectedDate | null = null;
let yearViewOpen = false;
let exportFromYear: number | undefined;
let exportToYear: number | undefined;

function ensureInitialized(): void {
  if (viewYear !== undefined && viewMonth !== undefined) return;
  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth() + 1;
  exportFromYear = viewYear;
  exportToYear = viewYear;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 0 = Thứ Hai .. 6 = Chủ Nhật (Monday-first, matching Vietnamese wall calendars). */
function mondayStartWeekday(year: number, month: number, day: number): number {
  const jsWeekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = Sunday
  return (jsWeekday + 6) % 7;
}

function renderDayCell(
  year: number,
  month: number,
  dayOfMonth: number,
  totalDaysInMonth: number,
  today: Date,
  isCurrentMonth: boolean,
): string {
  const lunar = solarToLunar({ year, month, day: dayOfMonth });
  const weekdayIdx = mondayStartWeekday(year, month, dayOfMonth);
  const isWeekend = weekdayIdx >= 5;
  const isToday = isCurrentMonth && today.getDate() === dayOfMonth;
  // Show "ngày/tháng âm" whenever a new lunar month starts, and also on the
  // first/last day of the displayed solar month, so it's clear at a glance
  // which lunar month(s) that solar month spans.
  const isMonthBoundary = dayOfMonth === 1 || dayOfMonth === totalDaysInMonth;
  const lunarLabel =
    lunar.day === 1 || isMonthBoundary
      ? `${lunar.day}/${lunar.month}${lunar.isLeap ? " (nh)" : ""}`
      : `${lunar.day}${lunar.isLeap ? "*" : ""}`;
  const isSelected =
    selectedDate !== null &&
    selectedDate.year === year &&
    selectedDate.month === month &&
    selectedDate.day === dayOfMonth;
  const holidayName = getLunarHolidayName(lunar);
  const classes = [
    "lookup-day",
    isWeekend ? "weekend" : "",
    isToday ? "today" : "",
    isSelected ? "selected" : "",
    holidayName ? "holiday" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const titleAttr = holidayName ? ` title="${escapeHtml(holidayName)}"` : "";
  return `
    <td
      class="${classes}"
      data-year="${year}"
      data-month="${month}"
      data-day="${dayOfMonth}"
      role="button"
      tabindex="0"${titleAttr}
    >
      <div class="solar-day">${dayOfMonth}</div>
      <div class="lunar-day">${lunarLabel}</div>
    </td>
  `;
}

function renderMonthGrid(year: number, month: number, today: Date, options: { compact: boolean }): string {
  const total = daysInMonth(year, month);
  const leadingBlanks = mondayStartWeekday(year, month, 1);
  const totalRows = Math.ceil((leadingBlanks + total) / 7);
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  const rows: string[] = [];
  for (let r = 0; r < totalRows; r++) {
    const rowCells: string[] = [];
    if (!options.compact) {
      // The calendar day-of-month that falls on this row's Monday column, even
      // if it spills into the previous/next month (JS Date normalizes that).
      const mondayDayOfMonth = r * 7 - leadingBlanks + 1;
      const mondayDate = new Date(Date.UTC(year, month - 1, mondayDayOfMonth));
      const weekNumber = getIsoWeekNumber({
        year: mondayDate.getUTCFullYear(),
        month: mondayDate.getUTCMonth() + 1,
        day: mondayDate.getUTCDate(),
      });
      rowCells.push(`<td class="week-number">${weekNumber}</td>`);
    }
    for (let c = 0; c < 7; c++) {
      const dayOfMonth = r * 7 + c - leadingBlanks + 1;
      rowCells.push(
        dayOfMonth < 1 || dayOfMonth > total
          ? `<td class="lookup-empty"></td>`
          : renderDayCell(year, month, dayOfMonth, total, today, isCurrentMonth),
      );
    }
    rows.push(`<tr>${rowCells.join("")}</tr>`);
  }

  const weekdayHeaderCells = WEEKDAY_HEADERS.map((h, i) => `<th class="${i >= 5 ? "weekend" : ""}">${h}</th>`).join(
    "",
  );

  return `
    <table class="lookup-grid${options.compact ? " compact" : ""}">
      <thead>
        <tr>
          ${options.compact ? "" : `<th class="week-number">Tuần</th>`}
          ${weekdayHeaderCells}
        </tr>
      </thead>
      <tbody>${rows.join("")}</tbody>
    </table>
  `;
}

function renderDayDetail(): string {
  if (selectedDate === null) return "";
  const solar = selectedDate;
  const lunar = solarToLunar(solar);
  const solarText = `${pad2(solar.day)}/${pad2(solar.month)}/${solar.year} (${getWeekdayName(solar)})`;
  const lunarText = `${lunar.day}/${lunar.month}${lunar.isLeap ? " (nhuận)" : ""} âm lịch`;
  const holidayName = getLunarHolidayName(lunar);

  return `
    <div class="lookup-detail-backdrop">
      <div class="lookup-detail" role="dialog" aria-modal="true">
        <button type="button" class="lookup-detail-close" aria-label="Đóng">×</button>
        ${holidayName ? `<p class="lookup-detail-holiday">${escapeHtml(holidayName)}</p>` : ""}
        <dl>
          <dt>Dương lịch</dt>
          <dd>${solarText}</dd>
          <dt>Âm lịch</dt>
          <dd>${lunarText}</dd>
          <dt>Ngày</dt>
          <dd>${getDayCanChi(solar)}</dd>
          <dt>Tháng</dt>
          <dd>${getMonthCanChi(lunar)}</dd>
          <dt>Năm</dt>
          <dd>${getYearCanChi(lunar.year)}</dd>
          <dt>Tiết khí</dt>
          <dd>${getSolarTermName(solar)}</dd>
        </dl>
      </div>
    </div>
  `;
}

function renderYearOverlay(year: number): string {
  if (!yearViewOpen) return "";
  const today = new Date();
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
    .map(
      (m) => `
        <div class="year-view-month">
          <h3>Tháng ${m}</h3>
          ${renderMonthGrid(year, m, today, { compact: true })}
        </div>
      `,
    )
    .join("");

  return `
    <div class="year-view-backdrop">
      <div class="year-view" role="dialog" aria-modal="true">
        <button type="button" class="year-view-close" aria-label="Đóng">×</button>
        <div class="year-view-header">
          <h2>Năm ${year} - ${getYearCanChi(year)}</h2>
          <div class="year-stepper">
            <button type="button" id="year-view-year-up" aria-label="Năm sau">▲</button>
            <button type="button" id="year-view-year-down" aria-label="Năm trước">▼</button>
          </div>
        </div>
        <div class="year-view-grid">${months}</div>
        <div class="year-view-footer">
          <button type="button" class="year-view-close-bottom">Đóng</button>
        </div>
      </div>
    </div>
  `;
}

export function renderLunarLookup(): string {
  ensureInitialized();
  const year = viewYear!;
  const month = viewMonth!;
  const today = new Date();

  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)
    .map((m) => `<option value="${m}" ${m === month ? "selected" : ""}>Tháng ${m}</option>`)
    .join("");

  return `
    <section class="card lunar-lookup">
      <div class="lookup-header">
        <button type="button" id="lookup-prev" aria-label="Tháng trước">‹</button>
        <div class="lookup-quickselect">
          <select id="lookup-month-select" aria-label="Chọn tháng">${monthOptions}</select>
          <div class="year-input-group">
            <input
              id="lookup-year-input"
              type="number"
              aria-label="Chọn năm"
              min="${MONTH_MIN_YEAR}"
              max="${MONTH_MAX_YEAR}"
              value="${year}"
            />
            <div class="year-stepper">
              <button type="button" id="lookup-year-up" aria-label="Tăng năm">▲</button>
              <button type="button" id="lookup-year-down" aria-label="Giảm năm">▼</button>
            </div>
          </div>
        </div>
        <button type="button" id="lookup-next" aria-label="Tháng sau">›</button>
        <button type="button" id="lookup-today">Hôm nay</button>
        <button type="button" id="lookup-year-view">Lịch năm</button>
      </div>
      ${renderMonthGrid(year, month, today, { compact: false })}
      <p class="hint">
        Số nhỏ bên dưới là ngày âm lịch (theo âm lịch Việt Nam, múi giờ UTC+7); hiện "ngày/tháng" vào đầu tháng âm
        và vào ngày đầu/cuối tháng dương. "*" hoặc "(nh)" = tháng nhuận. Cột "Tuần" là số tuần trong năm. Ô tô màu
        vàng là ngày lễ/tết âm lịch. Bấm vào 1 ngày để xem chi tiết.
      </p>
      <div class="export-range">
        <label>Từ năm
          <input
            id="export-from-year"
            type="number"
            min="${MONTH_MIN_YEAR}"
            max="${MONTH_MAX_YEAR}"
            value="${exportFromYear}"
          />
        </label>
        <label>Đến năm
          <input
            id="export-to-year"
            type="number"
            min="${MONTH_MIN_YEAR}"
            max="${MONTH_MAX_YEAR}"
            value="${exportToYear}"
          />
        </label>
        <button type="button" id="lookup-export-year-ics" class="lookup-export-btn">
          Xuất lịch âm ${exportFromYear === exportToYear ? `năm ${exportFromYear}` : `${exportFromYear} - ${exportToYear}`} (.ics)
        </button>
      </div>
      ${renderDayDetail()}
      ${renderYearOverlay(year)}
    </section>
  `;
}

export function wireLunarLookup(onChange: () => void): void {
  ensureInitialized();
  document.getElementById("lookup-prev")?.addEventListener("click", () => {
    viewMonth = viewMonth! - 1;
    if (viewMonth < 1) {
      viewMonth = 12;
      viewYear = viewYear! - 1;
    }
    selectedDate = null;
    onChange();
  });
  document.getElementById("lookup-next")?.addEventListener("click", () => {
    viewMonth = viewMonth! + 1;
    if (viewMonth > 12) {
      viewMonth = 1;
      viewYear = viewYear! + 1;
    }
    selectedDate = null;
    onChange();
  });
  document.getElementById("lookup-today")?.addEventListener("click", () => {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth() + 1;
    selectedDate = null;
    onChange();
  });
  document.getElementById("lookup-month-select")?.addEventListener("change", (e) => {
    viewMonth = Number((e.target as HTMLSelectElement).value);
    selectedDate = null;
    onChange();
  });
  document.getElementById("lookup-year-input")?.addEventListener("change", (e) => {
    const value = Number((e.target as HTMLInputElement).value);
    if (Number.isInteger(value) && value >= MONTH_MIN_YEAR && value <= MONTH_MAX_YEAR) {
      viewYear = value;
      selectedDate = null;
      onChange();
    }
  });
  document.getElementById("lookup-year-up")?.addEventListener("click", () => {
    const next = viewYear! + 1;
    if (next <= MONTH_MAX_YEAR) {
      viewYear = next;
      selectedDate = null;
      onChange();
    }
  });
  document.getElementById("lookup-year-down")?.addEventListener("click", () => {
    const next = viewYear! - 1;
    if (next >= MONTH_MIN_YEAR) {
      viewYear = next;
      selectedDate = null;
      onChange();
    }
  });
  document.getElementById("lookup-year-view")?.addEventListener("click", () => {
    yearViewOpen = true;
    onChange();
  });
  document.getElementById("export-from-year")?.addEventListener("change", (e) => {
    const value = Number((e.target as HTMLInputElement).value);
    if (Number.isInteger(value) && value >= MONTH_MIN_YEAR && value <= MONTH_MAX_YEAR) {
      exportFromYear = value;
      onChange();
    }
  });
  document.getElementById("export-to-year")?.addEventListener("change", (e) => {
    const value = Number((e.target as HTMLInputElement).value);
    if (Number.isInteger(value) && value >= MONTH_MIN_YEAR && value <= MONTH_MAX_YEAR) {
      exportToYear = value;
      onChange();
    }
  });
  document.getElementById("lookup-export-year-ics")?.addEventListener("click", () => {
    const from = exportFromYear!;
    const to = exportToYear!;
    if (from > to) {
      alert('"Từ năm" phải nhỏ hơn hoặc bằng "Đến năm". Vui lòng kiểm tra lại.');
      return;
    }
    const yearCount = to - from + 1;
    if (yearCount > 50 && !confirm(`Bạn sắp xuất lịch âm cho ${yearCount} năm - file sẽ khá lớn. Tiếp tục?`)) {
      return;
    }
    const events = Array.from({ length: yearCount }, (_, i) => from + i).flatMap((y) => buildLunarYearEvents(y));
    const filename = from === to ? `lich-am-${from}.ics` : `lich-am-${from}-${to}.ics`;
    downloadIcsFile(filename, buildIcsCalendar(events));
  });
  document.getElementById("year-view-year-up")?.addEventListener("click", () => {
    const next = viewYear! + 1;
    if (next <= MONTH_MAX_YEAR) {
      viewYear = next;
      onChange();
    }
  });
  document.getElementById("year-view-year-down")?.addEventListener("click", () => {
    const next = viewYear! - 1;
    if (next >= MONTH_MIN_YEAR) {
      viewYear = next;
      onChange();
    }
  });
  document.querySelector(".year-view-close")?.addEventListener("click", () => {
    yearViewOpen = false;
    onChange();
  });
  document.querySelector(".year-view-close-bottom")?.addEventListener("click", () => {
    yearViewOpen = false;
    onChange();
  });
  const yearViewBackdrop = document.querySelector<HTMLDivElement>(".year-view-backdrop");
  yearViewBackdrop?.addEventListener("click", (e) => {
    if (e.target === yearViewBackdrop) {
      yearViewOpen = false;
      onChange();
    }
  });
  document.querySelectorAll<HTMLTableCellElement>(".lookup-grid td.lookup-day").forEach((cell) => {
    const activate = () => {
      const clicked: SelectedDate = {
        year: Number(cell.dataset.year),
        month: Number(cell.dataset.month),
        day: Number(cell.dataset.day),
      };
      const isSame =
        selectedDate !== null &&
        selectedDate.year === clicked.year &&
        selectedDate.month === clicked.month &&
        selectedDate.day === clicked.day;
      selectedDate = isSame ? null : clicked;
      onChange();
    };
    cell.addEventListener("click", activate);
    cell.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate();
      }
    });
  });
  document.querySelector(".lookup-detail-close")?.addEventListener("click", () => {
    selectedDate = null;
    onChange();
  });
  const backdrop = document.querySelector<HTMLDivElement>(".lookup-detail-backdrop");
  backdrop?.addEventListener("click", (e) => {
    if (e.target === backdrop) {
      selectedDate = null;
      onChange();
    }
  });
}
