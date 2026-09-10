import type { AnniversaryEntry, AnniversaryInput } from "../models/anniversary";

const STORAGE_KEY = "taolicham.anniversaries.v1";

function readAll(): AnniversaryEntry[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as AnniversaryEntry[];
  } catch {
    return [];
  }
}

function writeAll(entries: AnniversaryEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function listAnniversaries(): AnniversaryEntry[] {
  return readAll();
}

export function addAnniversary(input: AnniversaryInput): AnniversaryEntry {
  const entries = readAll();
  const entry: AnniversaryEntry = { id: crypto.randomUUID(), ...input };
  entries.push(entry);
  writeAll(entries);
  return entry;
}

export function updateAnniversary(id: string, input: AnniversaryInput): void {
  const entries = readAll();
  const index = entries.findIndex((e) => e.id === id);
  if (index === -1) return;
  entries[index] = { id, ...input };
  writeAll(entries);
}

export function deleteAnniversary(id: string): void {
  writeAll(readAll().filter((e) => e.id !== id));
}
