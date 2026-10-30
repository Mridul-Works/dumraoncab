import { randomUUID } from "crypto";
import { jsonFile } from "./db";
import type { JournalEntry } from "./catalogTypes";

// Daily journal store (data/journal.json): one entry per trip actually run,
// with what it earned and what it cost.

// The stored record: a JournalEntry plus the journal-only details the entry
// panel captures. `km` stays the total distance run (both legs of a round trip).
export type JournalRecord = JournalEntry & {
  phone?: string; // customer's 10-digit mobile
  roundTrip?: boolean; // there and back
};

const db = jsonFile<JournalRecord[]>("journal.json", () => []);

// Newest day first; within a day, most recently logged first.
export async function listEntries(): Promise<JournalRecord[]> {
  const list = await db.read();
  return list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export async function getEntry(id: string): Promise<JournalRecord | undefined> {
  return (await db.read()).find((e) => e.id === id);
}

export type EntryInput = Omit<JournalRecord, "id" | "createdAt" | "updatedAt">;

export function addEntry(input: EntryInput) {
  return db.mutate((list) => {
    const entry: JournalRecord = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    list.push(entry);
    return entry;
  });
}

export function updateEntry(id: string, input: EntryInput) {
  return db.mutate((list) => {
    const i = list.findIndex((e) => e.id === id);
    if (i === -1) return null;
    list[i] = { ...input, id, createdAt: list[i].createdAt, updatedAt: new Date().toISOString() };
    return list[i];
  });
}

export function deleteEntry(id: string) {
  return db.mutate((list) => {
    const i = list.findIndex((e) => e.id === id);
    if (i === -1) return false;
    list.splice(i, 1);
    return true;
  });
}

// Entries keep their carId when a car is deleted, so history stays intact;
// the UI shows such entries as "Removed car".
