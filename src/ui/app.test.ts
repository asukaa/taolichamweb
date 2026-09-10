// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountApp } from "./app";

function currentLookup(): { month: number; year: number } {
  const month = Number((document.getElementById("lookup-month-select") as HTMLSelectElement).value);
  const year = Number((document.getElementById("lookup-year-input") as HTMLInputElement).value);
  return { month, year };
}

function setInput(name: string, value: string): void {
  const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)!;
  el.value = value;
}

function submitForm(): void {
  const form = document.getElementById("entry-form") as HTMLFormElement;
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  URL.createObjectURL = vi.fn(() => "blob:mock");
  URL.revokeObjectURL = vi.fn();
  window.alert = vi.fn();
  window.confirm = vi.fn(() => true);
  // jsdom doesn't implement scrollIntoView (real browsers do); stub it for the test env.
  Element.prototype.scrollIntoView = vi.fn();
});

describe("header and footer", () => {
  it("shows the current page title and a footer with copyright and contact info", () => {
    mountApp();
    expect(document.querySelector("h1")!.textContent).toBe("Âm Lịch Việt Nam");

    const footer = document.querySelector(".site-footer")!;
    expect(footer).not.toBeNull();
    expect(footer.textContent).toContain(String(new Date().getFullYear()));
    expect(footer.querySelector('a[href*="github.com"]')).not.toBeNull();
    expect(footer.querySelector('a[href^="mailto:"]')?.getAttribute("href")).toBe("mailto:thappham1190@gmail.com");
  });

  it("no longer labels the Can Chi day row with the '(Lục thập hoa giáp)' suffix", () => {
    mountApp();
    document.querySelector<HTMLTableCellElement>(".lookup-grid td.lookup-day")!.click();
    const dayLabel = Array.from(document.querySelectorAll(".lookup-detail dt")).find((dt) => dt.textContent === "Ngày");
    expect(dayLabel).toBeTruthy();
    expect(document.querySelector(".lookup-detail")!.textContent).not.toContain("Lục thập hoa giáp");
  });

  it('labels the years-ahead field "Tạo lịch cho bao nhiêu năm tới" and keeps it on the same row as the reminder settings', () => {
    mountApp();
    const yearsAheadLabel = document.querySelector("#years-ahead")!.closest("label")!;
    expect(yearsAheadLabel.textContent!.trim()).toContain("Tạo lịch cho bao nhiêu năm tới");

    const row = document.querySelector(".settings-row.compact")!;
    expect(row.contains(document.getElementById("years-ahead"))).toBe(true);
    expect(row.contains(document.getElementById("alarm-days"))).toBe(true);
    expect(row.contains(document.getElementById("alarm-hours"))).toBe(true);
    expect(row.contains(document.getElementById("alarm-minutes"))).toBe(true);
  });
});

describe("app end-to-end DOM flow", () => {
  it("adds, previews, exports, edits, and deletes an anniversary", () => {
    mountApp();

    // Empty state before adding anything.
    expect(document.querySelector(".empty")?.textContent).toContain("Chưa có ngày giỗ");

    // 1) Add
    setInput("personName", "Ông Test");
    setInput("eventLabel", "Giỗ Test");
    setInput("lunarDay", "10");
    setInput("lunarMonth", "5");
    setInput("lunarIsLeap", "false");
    setInput("description", "mô tả test");
    submitForm();

    const listAfterAdd = document.querySelector(".entry-list")!;
    expect(listAfterAdd.textContent).toContain("Giỗ Test");
    expect(listAfterAdd.textContent).toContain("Ông Test");
    expect(listAfterAdd.textContent).toContain("mô tả test");
    expect(document.querySelectorAll(".entry")).toHaveLength(1);

    // 2) Expand preview
    document.querySelector<HTMLButtonElement>(".toggle-preview")!.click();
    const table = document.querySelector(".preview table")!;
    const rows = table.querySelectorAll("tbody tr");
    expect(rows.length).toBeGreaterThan(0);
    expect(table.textContent).toContain("10/5");
    // every row should have year, lunar date, weekday, and a dd/mm/yyyy solar date
    for (const row of Array.from(rows)) {
      const cells = row.querySelectorAll("td");
      expect(cells).toHaveLength(4);
      expect(cells[2].textContent).toMatch(/^(Chủ Nhật|Thứ (Hai|Ba|Tư|Năm|Sáu|Bảy))$/);
      expect(cells[3].textContent).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    }

    // 3) Export (per-entry) must not throw and must trigger a Blob URL
    const exportBtn = document.querySelector<HTMLButtonElement>(".export-one")!;
    expect(() => exportBtn.click()).not.toThrow();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();

    // 3b) Export-all must also work
    const exportAllBtn = document.getElementById("export-all") as HTMLButtonElement;
    expect(exportAllBtn.disabled).toBe(false);
    expect(() => exportAllBtn.click()).not.toThrow();

    // 4) Edit: form should pre-fill with existing values
    document.querySelector<HTMLButtonElement>(".edit")!.click();
    expect((document.querySelector<HTMLInputElement>('[name="personName"]'))!.value).toBe("Ông Test");
    expect((document.querySelector<HTMLInputElement>('[name="lunarDay"]'))!.value).toBe("10");
    setInput("personName", "Ông Test Sửa");
    submitForm();

    const listAfterEdit = document.querySelector(".entry-list")!;
    expect(listAfterEdit.textContent).toContain("Ông Test Sửa");
    expect(document.querySelectorAll(".entry")).toHaveLength(1);

    // 5) Delete
    document.querySelector<HTMLButtonElement>(".delete")!.click();
    expect(window.confirm).toHaveBeenCalled();
    expect(document.querySelector(".empty")).not.toBeNull();
    expect(document.querySelectorAll(".entry")).toHaveLength(0);
  });

  it("auto-resolves lunarIsLeap from the death year without prompting when unambiguous", () => {
    mountApp();
    setInput("personName", "Ông Nội");
    setInput("eventLabel", "Giỗ Ông Nội");
    setInput("lunarDay", "25");
    setInput("lunarMonth", "12");
    setInput("deathYear", "2026"); // 25/12 with deathYear 2026 is unambiguous (no leap 12 nearby)
    submitForm();

    expect(window.confirm).not.toHaveBeenCalled();
    expect(window.alert).not.toHaveBeenCalled();
    const list = document.querySelector(".entry-list")!;
    expect(list.textContent).toContain("mất năm 2026");
  });

  it("warns and blocks save when neither death year nor leap-month checkbox is set, until confirmed", () => {
    mountApp();
    window.confirm = vi.fn(() => false); // user cancels the warning
    setInput("personName", "Bà Ngoại");
    setInput("eventLabel", "Giỗ Bà Ngoại");
    setInput("lunarDay", "9");
    setInput("lunarMonth", "2");
    submitForm();

    expect(window.confirm).toHaveBeenCalled();
    expect(document.querySelectorAll(".entry")).toHaveLength(0); // save was aborted
  });

  it("rejects invalid input (out-of-range lunar day) without creating an entry", () => {
    mountApp();
    setInput("personName", "Bà Test");
    setInput("eventLabel", "Giỗ Test 2");
    setInput("lunarDay", "40"); // invalid: > 30
    setInput("lunarMonth", "5");
    submitForm();

    expect(window.alert).toHaveBeenCalled();
    expect(document.querySelectorAll(".entry")).toHaveLength(0);
  });
});

describe("lunar lookup calendar", () => {
  it("renders an 8-column grid (week number + 7 weekdays) and navigates prev/next/today", () => {
    mountApp();

    expect(document.querySelectorAll(".lookup-grid thead th")).toHaveLength(8);
    expect(document.querySelectorAll(".lookup-grid td.lookup-day").length).toBeGreaterThanOrEqual(28);
    // every rendered week row should have a week-number cell
    const rowCount = document.querySelectorAll(".lookup-grid tbody tr").length;
    expect(document.querySelectorAll(".lookup-grid td.week-number")).toHaveLength(rowCount);

    const initial = currentLookup();
    document.getElementById("lookup-next")!.click();
    expect(currentLookup()).not.toEqual(initial);

    document.getElementById("lookup-prev")!.click();
    expect(currentLookup()).toEqual(initial);

    document.getElementById("lookup-next")!.click();
    document.getElementById("lookup-today")!.click();
    expect(currentLookup()).toEqual(initial);
  });

  it("wraps across a year boundary without throwing", () => {
    mountApp();
    const startYear = currentLookup().year;
    for (let i = 0; i < 12; i++) {
      document.getElementById("lookup-next")!.click();
    }
    expect(currentLookup().year).toBe(startYear + 1);
  });

  it("jumps directly via the month/year quick-select controls", () => {
    mountApp();
    const monthSelect = document.getElementById("lookup-month-select") as HTMLSelectElement;
    const yearInput = document.getElementById("lookup-year-input") as HTMLInputElement;

    monthSelect.value = "6";
    monthSelect.dispatchEvent(new Event("change"));
    expect(currentLookup().month).toBe(6);

    yearInput.value = "2030";
    yearInput.dispatchEvent(new Event("change"));
    expect(currentLookup()).toEqual({ month: 6, year: 2030 });
  });

  it("has up/down buttons that step the year, in addition to typing it directly", () => {
    mountApp();
    const startYear = currentLookup().year;

    document.getElementById("lookup-year-up")!.click();
    expect(currentLookup().year).toBe(startYear + 1);
    // re-query: the whole #app subtree is re-rendered after each click, so any
    // element reference captured before it is stale and must be looked up again.
    expect((document.getElementById("lookup-year-input") as HTMLInputElement).value).toBe(String(startYear + 1));

    document.getElementById("lookup-year-down")!.click();
    document.getElementById("lookup-year-down")!.click();
    expect(currentLookup().year).toBe(startYear - 1);
  });

  it("shows a day's detail (solar, lunar, Can Chi, tiết khí) on click, and closes it", () => {
    mountApp();
    const monthSelect = document.getElementById("lookup-month-select") as HTMLSelectElement;
    const yearInput = document.getElementById("lookup-year-input") as HTMLInputElement;
    monthSelect.value = "2";
    monthSelect.dispatchEvent(new Event("change"));
    yearInput.value = "2026";
    yearInput.dispatchEvent(new Event("change"));

    expect(document.querySelector(".lookup-detail")).toBeNull();

    const day12 = document.querySelector<HTMLTableCellElement>('.lookup-grid td.lookup-day[data-day="12"]')!;
    day12.click();

    const detail = document.querySelector(".lookup-detail")!;
    expect(detail).not.toBeNull();
    expect(detail.textContent).toContain("12/02/2026");
    expect(detail.textContent).toContain("Thứ Năm");
    expect(detail.textContent).toContain("âm lịch");
    expect(detail.textContent).toContain("Tiết khí");

    // clicking the same day again toggles it closed
    document.querySelector<HTMLTableCellElement>('.lookup-grid td.lookup-day[data-day="12"]')!.click();
    expect(document.querySelector(".lookup-detail")).toBeNull();

    // re-open, then close via the × button
    document.querySelector<HTMLTableCellElement>('.lookup-grid td.lookup-day[data-day="12"]')!.click();
    document.querySelector<HTMLButtonElement>(".lookup-detail-close")!.click();
    expect(document.querySelector(".lookup-detail")).toBeNull();
  });

  it("clears the selected day's detail when navigating to a different month", () => {
    mountApp();
    document.querySelector<HTMLTableCellElement>(".lookup-grid td.lookup-day")!.click();
    expect(document.querySelector(".lookup-detail")).not.toBeNull();

    document.getElementById("lookup-next")!.click();
    expect(document.querySelector(".lookup-detail")).toBeNull();
  });

  it("shows the lunar month on the first and last day of the displayed solar month", () => {
    mountApp();
    const monthSelect = document.getElementById("lookup-month-select") as HTMLSelectElement;
    const yearInput = document.getElementById("lookup-year-input") as HTMLInputElement;
    monthSelect.value = "2";
    monthSelect.dispatchEvent(new Event("change"));
    yearInput.value = "2026";
    yearInput.dispatchEvent(new Event("change"));

    const firstDay = document.querySelector('.lookup-grid td.lookup-day[data-day="1"] .lunar-day')!;
    const lastDay = document.querySelector('.lookup-grid td.lookup-day[data-day="28"] .lunar-day')!;
    expect(firstDay.textContent).toMatch(/\d+\/\d+/);
    expect(lastDay.textContent).toMatch(/\d+\/\d+/);
  });

  it("shows the day detail as a popup (backdrop overlay), and closes it when clicking the backdrop", () => {
    mountApp();
    document.querySelector<HTMLTableCellElement>(".lookup-grid td.lookup-day")!.click();
    const backdrop = document.querySelector<HTMLDivElement>(".lookup-detail-backdrop")!;
    expect(backdrop).not.toBeNull();
    expect(backdrop.querySelector(".lookup-detail")).not.toBeNull();

    // Clicking inside the modal content must NOT close it.
    backdrop.querySelector<HTMLElement>(".lookup-detail")!.click();
    expect(document.querySelector(".lookup-detail-backdrop")).not.toBeNull();

    // Clicking the backdrop itself (outside the modal content) closes it.
    backdrop.click();
    expect(document.querySelector(".lookup-detail-backdrop")).toBeNull();
  });

  it("highlights lunar holidays across a full year and shows the name in the detail panel", () => {
    mountApp();
    const monthSelect = document.getElementById("lookup-month-select") as HTMLSelectElement;
    const yearInput = document.getElementById("lookup-year-input") as HTMLInputElement;
    yearInput.value = "2026";
    yearInput.dispatchEvent(new Event("change"));

    let holidayCellsFound = 0;
    let sawTet = false;
    for (let month = 1; month <= 12; month++) {
      monthSelect.value = String(month);
      monthSelect.dispatchEvent(new Event("change"));
      const holidayCells = document.querySelectorAll(".lookup-grid td.holiday");
      holidayCellsFound += holidayCells.length;
      holidayCells.forEach((cell) => {
        if (cell.getAttribute("title") === "Tết Nguyên Đán") {
          sawTet = true;
          (cell as HTMLElement).click();
          expect(document.querySelector(".lookup-detail-holiday")?.textContent).toBe("Tết Nguyên Đán");
        }
      });
    }
    // One year should surface (at least) all 9 configured holidays.
    expect(holidayCellsFound).toBeGreaterThanOrEqual(9);
    expect(sawTet).toBe(true);
  });
});

describe("year calendar view", () => {
  it("shows a 'Lịch năm' button next to 'Hôm nay' that opens a 12-month overlay titled Năm - year - Can Chi", () => {
    mountApp();
    const todayBtn = document.getElementById("lookup-today")!;
    const yearViewBtn = document.getElementById("lookup-year-view")!;
    expect(yearViewBtn).not.toBeNull();
    expect(yearViewBtn.textContent).toBe("Lịch năm");
    expect(todayBtn.nextElementSibling).toBe(yearViewBtn);

    expect(document.querySelector(".year-view-backdrop")).toBeNull();

    const yearInput = document.getElementById("lookup-year-input") as HTMLInputElement;
    yearInput.value = "2026";
    yearInput.dispatchEvent(new Event("change"));
    yearViewBtn.click();

    const overlay = document.querySelector(".year-view-backdrop")!;
    expect(overlay).not.toBeNull();
    expect((overlay.querySelector("#year-view-year-input") as HTMLInputElement).value).toBe("2026");
    expect(overlay.querySelector(".year-view-canchi")!.textContent).toContain("Bính Ngọ");
    expect(overlay.querySelectorAll(".year-view-month")).toHaveLength(12);
  });

  it("opens the same day-detail popup when clicking a day inside the year view", () => {
    mountApp();
    const yearInput = document.getElementById("lookup-year-input") as HTMLInputElement;
    yearInput.value = "2026";
    yearInput.dispatchEvent(new Event("change"));
    document.getElementById("lookup-year-view")!.click();

    const dayCell = document.querySelector<HTMLTableCellElement>(
      '.year-view .lookup-grid.compact td.lookup-day[data-month="2"][data-day="12"]',
    )!;
    dayCell.click();

    const detail = document.querySelector(".lookup-detail")!;
    expect(detail).not.toBeNull();
    expect(detail.textContent).toContain("12/02/2026");
    // The year view stays open behind the day-detail popup.
    expect(document.querySelector(".year-view-backdrop")).not.toBeNull();
  });

  it("closes via the × button, the bottom 'Đóng' button, and clicking the backdrop", () => {
    mountApp();
    document.getElementById("lookup-year-view")!.click();
    expect(document.querySelector(".year-view-backdrop")).not.toBeNull();
    document.querySelector<HTMLButtonElement>(".year-view-close")!.click();
    expect(document.querySelector(".year-view-backdrop")).toBeNull();

    document.getElementById("lookup-year-view")!.click();
    document.querySelector<HTMLButtonElement>(".year-view-close-bottom")!.click();
    expect(document.querySelector(".year-view-backdrop")).toBeNull();

    document.getElementById("lookup-year-view")!.click();
    document.querySelector<HTMLDivElement>(".year-view-backdrop")!.click();
    expect(document.querySelector(".year-view-backdrop")).toBeNull();
  });

  it("has its own up/down buttons to step the year without closing the overlay", () => {
    mountApp();
    const yearInput = document.getElementById("lookup-year-input") as HTMLInputElement;
    yearInput.value = "2026";
    yearInput.dispatchEvent(new Event("change"));
    document.getElementById("lookup-year-view")!.click();

    const yearViewYearInput = () => document.getElementById("year-view-year-input") as HTMLInputElement;
    expect(yearViewYearInput().value).toBe("2026");
    expect(document.querySelector(".year-view-canchi")!.textContent).toContain("Bính Ngọ");

    document.getElementById("year-view-year-up")!.click();
    expect(document.querySelector(".year-view-backdrop")).not.toBeNull(); // stays open
    expect(yearViewYearInput().value).toBe("2027");
    expect(document.querySelector(".year-view-canchi")!.textContent).toContain("Đinh Mùi");
    // the underlying month view's year input stays in sync
    expect((document.getElementById("lookup-year-input") as HTMLInputElement).value).toBe("2027");

    document.getElementById("year-view-year-down")!.click();
    document.getElementById("year-view-year-down")!.click();
    expect(yearViewYearInput().value).toBe("2025");
    expect(document.querySelector(".year-view-canchi")!.textContent).toContain("Ất Tỵ");
  });

  it("lets the user type a year directly into the year-view input", () => {
    mountApp();
    document.getElementById("lookup-year-view")!.click();

    const yearViewYearInput = document.getElementById("year-view-year-input") as HTMLInputElement;
    yearViewYearInput.value = "2023";
    yearViewYearInput.dispatchEvent(new Event("change"));

    expect(document.querySelector(".year-view-backdrop")).not.toBeNull(); // stays open
    expect(document.querySelector(".year-view-canchi")!.textContent).toContain("Quý Mão");
    // 2023 (âm lịch) has a leap 2nd month - the year view should flag it.
    expect(document.querySelector(".year-view-canchi")!.textContent).toContain("(nhuận)");
    expect((document.getElementById("lookup-year-input") as HTMLInputElement).value).toBe("2023");
  });

  it("colors days that fall in a leap lunar month and names the leap month in the day detail", () => {
    mountApp();
    const yearInput = document.getElementById("lookup-year-input") as HTMLInputElement;
    yearInput.value = "2023";
    yearInput.dispatchEvent(new Event("change"));
    const monthSelect = document.getElementById("lookup-month-select") as HTMLSelectElement;
    monthSelect.value = "3"; // solar March 2023 falls inside the leap 2nd lunar month
    monthSelect.dispatchEvent(new Event("change"));

    const leapDay = document.querySelector<HTMLTableCellElement>(".lookup-grid td.leap-month");
    expect(leapDay).not.toBeNull();

    leapDay!.click();
    const detail = document.querySelector(".lookup-detail")!;
    expect(detail.textContent).toContain("nhuận");
  });
});

describe("full lunar-calendar year export", () => {
  it("defaults from/to year to the currently viewed year and downloads a single-year .ics", () => {
    mountApp();
    const yearInput = document.getElementById("lookup-year-input") as HTMLInputElement;
    yearInput.value = "2026";
    yearInput.dispatchEvent(new Event("change"));

    expect((document.getElementById("export-from-year") as HTMLInputElement).value).toBe("2026");
    expect((document.getElementById("export-to-year") as HTMLInputElement).value).toBe("2026");

    const btn = document.getElementById("lookup-export-year-ics")!;
    expect(btn.textContent!.trim()).toBe("Xuất lịch âm năm 2026 (.ics)");
    expect(() => btn.click()).not.toThrow();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("exports a custom year range and updates the button label accordingly", () => {
    mountApp();
    const fromInput = document.getElementById("export-from-year") as HTMLInputElement;
    fromInput.value = "2025";
    fromInput.dispatchEvent(new Event("change"));
    const toInput = document.getElementById("export-to-year") as HTMLInputElement;
    toInput.value = "2027";
    toInput.dispatchEvent(new Event("change"));

    const btn = document.getElementById("lookup-export-year-ics")!;
    expect(btn.textContent!.trim()).toBe("Xuất lịch âm 2025 - 2027 (.ics)");
    expect(() => btn.click()).not.toThrow();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("rejects an invalid range (from > to) without exporting", () => {
    mountApp();
    const fromInput = document.getElementById("export-from-year") as HTMLInputElement;
    fromInput.value = "2030";
    fromInput.dispatchEvent(new Event("change"));
    const toInput = document.getElementById("export-to-year") as HTMLInputElement;
    toInput.value = "2020";
    toInput.dispatchEvent(new Event("change"));

    document.getElementById("lookup-export-year-ics")!.click();
    expect(window.alert).toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("warns for a very large range and aborts if the user cancels", () => {
    mountApp();
    window.confirm = vi.fn(() => false);
    const fromInput = document.getElementById("export-from-year") as HTMLInputElement;
    fromInput.value = "1950";
    fromInput.dispatchEvent(new Event("change"));
    const toInput = document.getElementById("export-to-year") as HTMLInputElement;
    toInput.value = "2050";
    toInput.dispatchEvent(new Event("change"));

    document.getElementById("lookup-export-year-ics")!.click();
    expect(window.confirm).toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});

describe("VALARM reminder settings", () => {
  function addOneEntry(): void {
    setInput("personName", "Ông Test");
    setInput("eventLabel", "Giỗ Test");
    setInput("lunarDay", "10");
    setInput("lunarMonth", "5");
    submitForm();
  }

  it("defaults to reminding 1 day before, with 0 hours and 0 minutes", () => {
    mountApp();
    expect((document.getElementById("alarm-days") as HTMLInputElement).value).toBe("1");
    expect((document.getElementById("alarm-hours") as HTMLInputElement).value).toBe("0");
    expect((document.getElementById("alarm-minutes") as HTMLInputElement).value).toBe("0");
  });

  it("persists changes across a re-render", () => {
    mountApp();
    const daysInput = document.getElementById("alarm-days") as HTMLInputElement;
    daysInput.value = "2";
    daysInput.dispatchEvent(new Event("change"));
    const hoursInput = document.getElementById("alarm-hours") as HTMLInputElement;
    hoursInput.value = "5";
    hoursInput.dispatchEvent(new Event("change"));
    const minutesInput = document.getElementById("alarm-minutes") as HTMLInputElement;
    minutesInput.value = "30";
    minutesInput.dispatchEvent(new Event("change"));

    mountApp(); // simulate reloading the page
    expect((document.getElementById("alarm-days") as HTMLInputElement).value).toBe("2");
    expect((document.getElementById("alarm-hours") as HTMLInputElement).value).toBe("5");
    expect((document.getElementById("alarm-minutes") as HTMLInputElement).value).toBe("30");
  });

  it("adds a matching VALARM to both the 'export all' and the per-entry .ics export", async () => {
    mountApp();
    const daysInput = document.getElementById("alarm-days") as HTMLInputElement;
    daysInput.value = "0";
    daysInput.dispatchEvent(new Event("change"));
    const minutesInput = document.getElementById("alarm-minutes") as HTMLInputElement;
    minutesInput.value = "15";
    minutesInput.dispatchEvent(new Event("change"));

    addOneEntry();

    const createObjectURL = URL.createObjectURL as ReturnType<typeof vi.fn>;

    document.getElementById("export-all")!.click();
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const allIcsText = await (createObjectURL.mock.calls[0][0] as Blob).text();
    expect(allIcsText).toContain("TRIGGER:-PT15M");
    expect(allIcsText).toContain("DESCRIPTION:15 phút nữa là tới Giỗ Test");

    document.querySelector<HTMLButtonElement>(".toggle-preview")!.click(); // reveal the per-entry export button
    document.querySelector<HTMLButtonElement>(".export-one")!.click();
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    const oneIcsText = await (createObjectURL.mock.calls[1][0] as Blob).text();
    expect(oneIcsText).toContain("TRIGGER:-PT15M");
    expect(oneIcsText).toContain("DESCRIPTION:15 phút nữa là tới Giỗ Test");
  });
});

describe("Excel import/export toolbar", () => {
  it("exports entries to Excel and downloads the sample template without throwing", async () => {
    mountApp();
    setInput("personName", "Ông Test");
    setInput("eventLabel", "Giỗ Test");
    setInput("lunarDay", "10");
    setInput("lunarMonth", "5");
    submitForm();

    document.getElementById("export-excel")!.click();
    await vi.waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());

    (URL.createObjectURL as ReturnType<typeof vi.fn>).mockClear();
    document.getElementById("download-template")!.click();
    await vi.waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
  });

  it("clicking the import button opens the hidden file picker", () => {
    mountApp();
    const input = document.getElementById("import-file-input") as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");
    document.getElementById("import-excel")!.click();
    expect(clickSpy).toHaveBeenCalled();
  });
});
