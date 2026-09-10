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

function setChecked(name: string, checked: boolean): void {
  const el = document.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
  el.checked = checked;
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
    setChecked("lunarIsLeap", false);
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
