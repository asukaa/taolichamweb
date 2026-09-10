import {
  addAnniversary,
  deleteAnniversary,
  listAnniversaries,
  updateAnniversary,
} from "../storage/anniversaryRepository";
import { projectAnniversaryYears } from "../core/anniversaryProjection";
import { getWeekdayName, resolveLeapFromDeathYear } from "../core/lunarCalendar";
import { buildIcsCalendar, downloadIcsFile, type IcsEventInput } from "../services/icsExport";
import { downloadBlob } from "../services/download";
import type { AnniversaryEntry, AnniversaryInput } from "../models/anniversary";
import { renderLunarLookup, wireLunarLookup } from "./lunarLookup";
import { renderDonateButton, renderHelpButton, renderInfoPanels, wireInfoPanels } from "./infoPanels";
import { isIcsGuideRoute, renderIcsGuidePage } from "./icsGuide";
import { escapeHtml } from "./escapeHtml";

const YEARS_AHEAD_KEY = "taolicham.yearsAhead.v1";
const DEFAULT_YEARS_AHEAD = 15;

const ALARM_DAYS_KEY = "taolicham.alarmDays.v1";
const ALARM_HOURS_KEY = "taolicham.alarmHours.v1";
const ALARM_MINUTES_KEY = "taolicham.alarmMinutes.v1";
const DEFAULT_ALARM_DAYS = 1;

let editingId: string | null = null;
let expandedId: string | null = null;

function getYearsAhead(): number {
  const raw = localStorage.getItem(YEARS_AHEAD_KEY);
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_YEARS_AHEAD;
}

function setYearsAhead(n: number): void {
  localStorage.setItem(YEARS_AHEAD_KEY, String(n));
}

function getStoredNonNegativeInt(key: string, fallback: number): number {
  const raw = localStorage.getItem(key);
  const n = raw !== null ? parseInt(raw, 10) : NaN;
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}

function getAlarmSettings(): { days: number; hours: number; minutes: number } {
  return {
    days: getStoredNonNegativeInt(ALARM_DAYS_KEY, DEFAULT_ALARM_DAYS),
    hours: getStoredNonNegativeInt(ALARM_HOURS_KEY, 0),
    minutes: getStoredNonNegativeInt(ALARM_MINUTES_KEY, 0),
  };
}

function formatSolar(d: { year: number; month: number; day: number }): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.day)}/${pad(d.month)}/${d.year}`;
}

function formatLunar(entry: Pick<AnniversaryEntry, "lunarDay" | "lunarMonth" | "lunarIsLeap">): string {
  return `${entry.lunarDay}/${entry.lunarMonth}${entry.lunarIsLeap ? " (nhuận)" : ""}`;
}

function entryToIcsEvents(entry: AnniversaryEntry, yearsAhead: number): IcsEventInput[] {
  const startYear = new Date().getFullYear();
  const occurrences = projectAnniversaryYears(
    { lunarDay: entry.lunarDay, lunarMonth: entry.lunarMonth, lunarIsLeap: entry.lunarIsLeap },
    startYear,
    startYear + yearsAhead,
  );
  return occurrences.map((o) => ({
    summary: `${entry.eventLabel}(${entry.lunarDay}/${entry.lunarMonth})`,
    description: entry.description,
    date: o.solar,
    alarmLabel: entry.eventLabel,
  }));
}

interface RawEntryInput {
  personName: string;
  eventLabel: string;
  lunarDay: number;
  lunarMonth: number;
  lunarIsLeapChecked: boolean;
  deathYear: number | null;
  description: string;
}

function readRawFormInput(form: HTMLFormElement): RawEntryInput | null {
  const data = new FormData(form);
  const personName = String(data.get("personName") ?? "").trim();
  const eventLabel = String(data.get("eventLabel") ?? "").trim();
  const lunarDay = Number(data.get("lunarDay"));
  const lunarMonth = Number(data.get("lunarMonth"));
  const lunarIsLeapChecked = data.get("lunarIsLeap") === "true";
  const deathYearRaw = String(data.get("deathYear") ?? "").trim();
  const deathYear = deathYearRaw ? Number(deathYearRaw) : null;
  const description = String(data.get("description") ?? "").trim();

  if (!personName || !eventLabel) return null;
  if (!Number.isInteger(lunarDay) || lunarDay < 1 || lunarDay > 30) return null;
  if (!Number.isInteger(lunarMonth) || lunarMonth < 1 || lunarMonth > 12) return null;
  if (deathYear !== null && (!Number.isInteger(deathYear) || deathYear < 1900 || deathYear > 2200)) return null;

  return { personName, eventLabel, lunarDay, lunarMonth, lunarIsLeapChecked, deathYear, description };
}

/**
 * Works out the effective "isLeap" flag to save, using the death year when given
 * to auto-detect or confirm it. Returns null when the user needs to go fix
 * something first (invalid year) - the caller should abort the save in that case.
 */
function resolveLunarIsLeap(raw: RawEntryInput): boolean | null {
  if (raw.deathYear !== null) {
    const resolution = resolveLeapFromDeathYear(raw.lunarDay, raw.lunarMonth, raw.deathYear);
    if (resolution.invalid) {
      alert(
        `Năm mất ${raw.deathYear} không khớp với ngày ${raw.lunarDay}/${raw.lunarMonth} âm lịch đã chọn. Vui lòng kiểm tra lại.`,
      );
      return null;
    }
    if (resolution.ambiguous) {
      alert(
        `Lưu ý: năm ${raw.deathYear} âm lịch có cả tháng ${raw.lunarMonth} thường và tháng ${raw.lunarMonth} nhuận. ` +
          `Hệ thống không tự xác định được — hãy chọn "Tháng nhuận" ở ô "Loại tháng" nếu đúng là tháng nhuận, để "Tháng thường" nếu không phải.`,
      );
      return raw.lunarIsLeapChecked;
    }
    return resolution.isLeap;
  }
  return raw.lunarIsLeapChecked;
}

function renderForm(entries: AnniversaryEntry[]): string {
  const editing = editingId ? entries.find((e) => e.id === editingId) ?? null : null;
  return `
    <form id="entry-form" class="card">
      <h2>${editing ? "Sửa ngày giỗ" : "Tạo lịch nhắc công việc"}</h2>
      <label>Họ và Tên
        <input name="personName" required value="${editing ? escapeHtml(editing.personName) : ""}" placeholder="VD: Ông Nguyễn Văn A" />
      </label>
      <label>Tên sự kiện
        <input name="eventLabel" required value="${editing ? escapeHtml(editing.eventLabel) : ""}" placeholder="VD: Giỗ Ông Nội" />
      </label>
      <div class="row">
        <label>Ngày âm lịch
          <input name="lunarDay" type="number" min="1" max="30" required value="${editing ? editing.lunarDay : ""}" />
        </label>
        <label>Tháng âm lịch
          <input name="lunarMonth" type="number" min="1" max="12" required value="${editing ? editing.lunarMonth : ""}" />
        </label>
        <label>Loại tháng
          <select name="lunarIsLeap">
            <option value="false" ${editing?.lunarIsLeap ? "" : "selected"}>Tháng thường</option>
            <option value="true" ${editing?.lunarIsLeap ? "selected" : ""}>Tháng nhuận</option>
          </select>
        </label>
        <label>Năm mất (dương lịch)
          <input name="deathYear" type="number" min="1900" max="2200" value="${editing?.deathYear ?? ""}" placeholder="VD: 2017" />
        </label>
      </div>
      <p class="hint">
        💡 "Năm mất" không bắt buộc — chỉ cần nhập khi biết, để hệ thống tự xác định tháng nhuận thay vì phải tự
        chọn. Nếu không nhập năm mất, hệ thống sẽ lưu theo lựa chọn ở ô "Loại tháng" (mặc định là "Tháng thường").
        Nếu ngày giỗ thực tế rơi vào tháng nhuận mà ô "Loại tháng" đang để "Tháng thường" (hoặc ngược lại), ngày
        dương lịch tính ra sẽ bị sai lệch khoảng 1 tháng — hãy chọn đúng loại tháng trước khi lưu. Tháng nhuận
        không lặp lại mỗi năm, nên nếu chọn "Tháng nhuận": những năm âm lịch nào có đúng tháng nhuận đó thì lấy
        theo tháng nhuận, còn các năm khác sẽ tự động lấy theo tháng thường tương ứng để giỗ vẫn diễn ra đều
        đặn mỗi năm.
      </p>
      <label>Ghi chú thêm ...
        <textarea name="description" rows="2" placeholder="VD: mất lúc 14h ngày 02/12/2025">${editing ? escapeHtml(editing.description) : ""}</textarea>
      </label>
      <div class="row">
        <button type="submit">${editing ? "Lưu thay đổi" : "Thêm"}</button>
        ${editing ? `<button type="button" id="cancel-edit">Hủy</button>` : ""}
      </div>
    </form>
  `;
}

function renderPreview(entry: AnniversaryEntry, yearsAhead: number): string {
  const startYear = new Date().getFullYear();
  const occurrences = projectAnniversaryYears(
    { lunarDay: entry.lunarDay, lunarMonth: entry.lunarMonth, lunarIsLeap: entry.lunarIsLeap },
    startYear,
    startYear + yearsAhead,
  );
  const rows = occurrences
    .map(
      (o) =>
        `<tr><td>${o.year}</td><td>${entry.lunarDay}/${entry.lunarMonth}${o.isLeap ? " (nhuận)" : ""}</td><td>${getWeekdayName(o.solar)}</td><td>${formatSolar(o.solar)}</td></tr>`,
    )
    .join("");
  return `
    <div class="preview">
      <table>
        <thead><tr><th>Năm</th><th>Ngày âm</th><th>Thứ</th><th>Ngày dương</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <button type="button" class="export-one" data-id="${entry.id}">Tải file .ics riêng</button>
    </div>
  `;
}

function renderList(entries: AnniversaryEntry[], yearsAhead: number): string {
  if (entries.length === 0) {
    return `<p class="empty">Chưa có ngày giỗ nào. Thêm mới ở form phía trên.</p>`;
  }
  return entries
    .map((entry) => {
      const expanded = expandedId === entry.id;
      return `
        <li class="entry" data-id="${entry.id}">
          <div class="entry-row">
            <div class="entry-info">
              <strong>${escapeHtml(entry.eventLabel)}</strong>
              <span>${escapeHtml(entry.personName)} — ${formatLunar(entry)} âm lịch${
                entry.deathYear ? ` (mất năm ${entry.deathYear})` : ""
              }</span>
              ${entry.description ? `<span class="desc">${escapeHtml(entry.description)}</span>` : ""}
            </div>
            <div class="entry-actions">
              <button type="button" class="toggle-preview" data-id="${entry.id}">${expanded ? "Ẩn xem trước" : "Xem trước"}</button>
              <button type="button" class="edit" data-id="${entry.id}">Sửa</button>
              <button type="button" class="delete" data-id="${entry.id}">Xóa</button>
            </div>
          </div>
          ${expanded ? renderPreview(entry, yearsAhead) : ""}
        </li>
      `;
    })
    .join("");
}

function render(): void {
  const app = document.getElementById("app");
  if (!app) return;

  if (isIcsGuideRoute()) {
    app.innerHTML = renderIcsGuidePage();
    return;
  }

  const entries = listAnniversaries();
  const yearsAhead = getYearsAhead();
  const alarmSettings = getAlarmSettings();

  app.innerHTML = `
    <header>
      <div class="header-top">
        <h1>Âm Lịch Việt Nam</h1>
        ${renderHelpButton()}
      </div>
      <p class="subtitle">Tra cứu lịch âm dương - Tạo lời nhắc theo ngày âm lịch trong nhiều năm tiếp theo.</p>
    </header>
    ${renderLunarLookup()}
    ${renderForm(entries)}
    <section class="card">
      <div class="settings-row compact">
        <label class="settings-field">Tạo lịch cho bao nhiêu năm tới
          <input id="years-ahead" type="number" min="1" max="50" value="${yearsAhead}" />
        </label>
        <div class="settings-field">
          <span class="settings-field-label">Nhắc trước (khi xuất .ics)</span>
          <div class="alarm-inline">
            <input id="alarm-days" type="number" min="0" value="${alarmSettings.days}" aria-label="Số ngày nhắc trước" />
            <span>ngày</span>
            <input id="alarm-hours" type="number" min="0" max="23" value="${alarmSettings.hours}" aria-label="Số giờ nhắc trước" />
            <span>giờ</span>
            <input
              id="alarm-minutes"
              type="number"
              min="0"
              max="59"
              value="${alarmSettings.minutes}"
              aria-label="Số phút nhắc trước"
            />
            <span>phút</span>
          </div>
        </div>
      </div>
      <div class="toolbar">
        <button type="button" id="export-all" ${entries.length === 0 ? "disabled" : ""}>Xuất file nhắc việc (.ics)</button>
        <button type="button" id="import-excel">Nhập từ Excel</button>
        <input type="file" id="import-file-input" accept=".xlsx" hidden />
        <button type="button" id="export-excel" ${entries.length === 0 ? "disabled" : ""}>Xuất ra Excel</button>
        <button type="button" id="download-template">Tải file mẫu (.xlsx)</button>
      </div>
      <ul class="entry-list">${renderList(entries, yearsAhead)}</ul>
    </section>
    <div class="donate-row">${renderDonateButton()}</div>
    ${renderFooter()}
    ${renderInfoPanels()}
  `;

  wireEvents(entries, yearsAhead);
  wireLunarLookup(render);
  wireInfoPanels(render);
}

function renderFooter(): string {
  const year = new Date().getFullYear();
  return `
    <footer class="site-footer">
      <p>© ${year} Âm Lịch Việt Nam. Mã nguồn: <a href="https://github.com/asukaa/Lich-am-va-loi-nhac-lich-am" target="_blank" rel="noopener">github.com/asukaa/Lich-am-va-loi-nhac-lich-am</a></p>
      <p>Liên hệ: <a href="mailto:thappham1190@gmail.com">thappham1190@gmail.com</a></p>
    </footer>
  `;
}

function wireEvents(entries: AnniversaryEntry[], yearsAhead: number): void {
  const form = document.getElementById("entry-form") as HTMLFormElement | null;
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = readRawFormInput(form);
    if (!raw) {
      alert(
        "Vui lòng nhập đủ tên, nhãn sự kiện, ngày/tháng âm lịch hợp lệ (ngày 1-30, tháng 1-12), và năm mất hợp lệ nếu có nhập.",
      );
      return;
    }
    const lunarIsLeap = resolveLunarIsLeap(raw);
    if (lunarIsLeap === null) return;
    const input: AnniversaryInput = {
      personName: raw.personName,
      eventLabel: raw.eventLabel,
      lunarDay: raw.lunarDay,
      lunarMonth: raw.lunarMonth,
      lunarIsLeap,
      deathYear: raw.deathYear,
      description: raw.description,
    };
    if (editingId) {
      updateAnniversary(editingId, input);
      editingId = null;
    } else {
      addAnniversary(input);
    }
    render();
  });

  document.getElementById("cancel-edit")?.addEventListener("click", () => {
    editingId = null;
    render();
  });

  document.getElementById("years-ahead")?.addEventListener("change", (e) => {
    const value = Number((e.target as HTMLInputElement).value);
    if (Number.isInteger(value) && value > 0) {
      setYearsAhead(value);
      render();
    }
  });

  document.getElementById("alarm-days")?.addEventListener("change", (e) => {
    const value = Number((e.target as HTMLInputElement).value);
    if (Number.isInteger(value) && value >= 0) {
      localStorage.setItem(ALARM_DAYS_KEY, String(value));
    }
  });
  document.getElementById("alarm-hours")?.addEventListener("change", (e) => {
    const value = Number((e.target as HTMLInputElement).value);
    if (Number.isInteger(value) && value >= 0 && value <= 23) {
      localStorage.setItem(ALARM_HOURS_KEY, String(value));
    }
  });
  document.getElementById("alarm-minutes")?.addEventListener("change", (e) => {
    const value = Number((e.target as HTMLInputElement).value);
    if (Number.isInteger(value) && value >= 0 && value <= 59) {
      localStorage.setItem(ALARM_MINUTES_KEY, String(value));
    }
  });

  document.getElementById("export-all")?.addEventListener("click", () => {
    const allEvents = entries.flatMap((entry) => entryToIcsEvents(entry, yearsAhead));
    downloadIcsFile("ngay-gio.ics", buildIcsCalendar(allEvents, getAlarmSettings()));
  });

  // The Excel library is only needed for these actions, so it's loaded on demand
  // instead of bloating the initial page load.
  document.getElementById("download-template")?.addEventListener("click", () => {
    void import("../services/excelIO").then(({ buildSampleTemplate }) =>
      buildSampleTemplate().then((blob) => downloadBlob("mau-ngay-gio.xlsx", blob)),
    );
  });

  document.getElementById("export-excel")?.addEventListener("click", () => {
    void import("../services/excelIO").then(({ exportEntriesToExcel }) =>
      exportEntriesToExcel(entries).then((blob) => downloadBlob("ngay-gio.xlsx", blob)),
    );
  });

  const importInput = document.getElementById("import-file-input") as HTMLInputElement | null;
  document.getElementById("import-excel")?.addEventListener("click", () => {
    importInput?.click();
  });
  importInput?.addEventListener("change", () => {
    const file = importInput.files?.[0];
    if (!file) return;
    void import("../services/excelIO").then(({ parseExcelFile }) =>
      parseExcelFile(file).then(({ entries: imported, notes }) => {
        imported.forEach((input) => addAnniversary(input));
        const summary = `Đã nhập ${imported.length} ngày giỗ.` + (notes.length ? `\n\n${notes.join("\n")}` : "");
        alert(summary);
        importInput.value = "";
        render();
      }),
    );
  });

  document.querySelectorAll<HTMLButtonElement>(".toggle-preview").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id!;
      expandedId = expandedId === id ? null : id;
      render();
    });
  });

  document.querySelectorAll<HTMLButtonElement>(".edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      editingId = btn.dataset.id!;
      render();
      document.getElementById("entry-form")?.scrollIntoView({ behavior: "smooth" });
    });
  });

  document.querySelectorAll<HTMLButtonElement>(".delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id!;
      const entry = entries.find((e) => e.id === id);
      if (entry && confirm(`Xóa "${entry.eventLabel} - ${entry.personName}"?`)) {
        deleteAnniversary(id);
        render();
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>(".export-one").forEach((btn) => {
    btn.addEventListener("click", () => {
      const entry = entries.find((e) => e.id === btn.dataset.id);
      if (!entry) return;
      downloadIcsFile(`${entry.eventLabel}.ics`, buildIcsCalendar(entryToIcsEvents(entry, yearsAhead), getAlarmSettings()));
    });
  });
}

export function mountApp(): void {
  window.addEventListener("hashchange", render);
  render();
}
