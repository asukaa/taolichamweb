import { getIsoWeekNumber, solarToLunar } from "../core/lunarCalendar";

const WEEKDAY_HEADERS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTH_MIN_YEAR = 1900;
const MONTH_MAX_YEAR = 2200;

let viewYear: number | undefined;
let viewMonth: number | undefined;

function ensureInitialized(): void {
  if (viewYear !== undefined && viewMonth !== undefined) return;
  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth() + 1;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 0 = Thứ Hai .. 6 = Chủ Nhật (Monday-first, matching Vietnamese wall calendars). */
function mondayStartWeekday(year: number, month: number, day: number): number {
  const jsWeekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = Sunday
  return (jsWeekday + 6) % 7;
}

function renderDayCell(year: number, month: number, dayOfMonth: number, today: Date, isCurrentMonth: boolean): string {
  const lunar = solarToLunar({ year, month, day: dayOfMonth });
  const weekdayIdx = mondayStartWeekday(year, month, dayOfMonth);
  const isWeekend = weekdayIdx >= 5;
  const isToday = isCurrentMonth && today.getDate() === dayOfMonth;
  const lunarLabel =
    lunar.day === 1 ? `${lunar.day}/${lunar.month}${lunar.isLeap ? " (nh)" : ""}` : `${lunar.day}${lunar.isLeap ? "*" : ""}`;
  const classes = ["lookup-day", isWeekend ? "weekend" : "", isToday ? "today" : ""].filter(Boolean).join(" ");
  return `
    <td class="${classes}">
      <div class="solar-day">${dayOfMonth}</div>
      <div class="lunar-day">${lunarLabel}</div>
    </td>
  `;
}

export function renderLunarLookup(): string {
  ensureInitialized();
  const year = viewYear!;
  const month = viewMonth!;
  const total = daysInMonth(year, month);
  const leadingBlanks = mondayStartWeekday(year, month, 1);
  const totalRows = Math.ceil((leadingBlanks + total) / 7);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

  const rows: string[] = [];
  for (let r = 0; r < totalRows; r++) {
    // The calendar day-of-month that falls on this row's Monday column, even if
    // it spills into the previous/next month (JS Date normalizes that for us).
    const mondayDayOfMonth = r * 7 - leadingBlanks + 1;
    const mondayDate = new Date(Date.UTC(year, month - 1, mondayDayOfMonth));
    const weekNumber = getIsoWeekNumber({
      year: mondayDate.getUTCFullYear(),
      month: mondayDate.getUTCMonth() + 1,
      day: mondayDate.getUTCDate(),
    });

    const rowCells = [`<td class="week-number">${weekNumber}</td>`];
    for (let c = 0; c < 7; c++) {
      const dayOfMonth = r * 7 + c - leadingBlanks + 1;
      rowCells.push(
        dayOfMonth < 1 || dayOfMonth > total
          ? `<td class="lookup-empty"></td>`
          : renderDayCell(year, month, dayOfMonth, today, isCurrentMonth),
      );
    }
    rows.push(`<tr>${rowCells.join("")}</tr>`);
  }

  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)
    .map((m) => `<option value="${m}" ${m === month ? "selected" : ""}>Tháng ${m}</option>`)
    .join("");

  return `
    <section class="card lunar-lookup">
      <div class="lookup-header">
        <button type="button" id="lookup-prev" aria-label="Tháng trước">‹</button>
        <div class="lookup-quickselect">
          <select id="lookup-month-select" aria-label="Chọn tháng">${monthOptions}</select>
          <input
            id="lookup-year-input"
            type="number"
            aria-label="Chọn năm"
            min="${MONTH_MIN_YEAR}"
            max="${MONTH_MAX_YEAR}"
            value="${year}"
          />
        </div>
        <button type="button" id="lookup-next" aria-label="Tháng sau">›</button>
        <button type="button" id="lookup-today">Hôm nay</button>
      </div>
      <table class="lookup-grid">
        <thead>
          <tr>
            <th>Tuần</th>
            ${WEEKDAY_HEADERS.map((h) => `<th>${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>${rows.join("")}</tbody>
      </table>
      <p class="hint">
        Số nhỏ bên dưới là ngày âm lịch (theo âm lịch Việt Nam, múi giờ UTC+7); hiện "ngày/tháng" vào đầu tháng âm.
        "*" hoặc "(nh)" = tháng nhuận. Cột "Tuần" là số tuần trong năm.
      </p>
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
    onChange();
  });
  document.getElementById("lookup-next")?.addEventListener("click", () => {
    viewMonth = viewMonth! + 1;
    if (viewMonth > 12) {
      viewMonth = 1;
      viewYear = viewYear! + 1;
    }
    onChange();
  });
  document.getElementById("lookup-today")?.addEventListener("click", () => {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth() + 1;
    onChange();
  });
  document.getElementById("lookup-month-select")?.addEventListener("change", (e) => {
    viewMonth = Number((e.target as HTMLSelectElement).value);
    onChange();
  });
  document.getElementById("lookup-year-input")?.addEventListener("change", (e) => {
    const value = Number((e.target as HTMLInputElement).value);
    if (Number.isInteger(value) && value >= MONTH_MIN_YEAR && value <= MONTH_MAX_YEAR) {
      viewYear = value;
      onChange();
    }
  });
}
