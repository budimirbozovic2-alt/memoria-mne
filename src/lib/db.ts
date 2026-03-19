import Dexie, { type Table } from "dexie";
import { Card } from "./spaced-repetition";
import { ReviewLogEntry, PomodoroLogEntry, LearnCardProgress } from "./storage";

// ─── Database Schema ────────────────────────────────────
class MemoriaDB extends Dexie {
  cards!: Table<Card, string>;
  categories!: Table<{ id: string; name: string }, string>;
  subcategories!: Table<{ id: string; category: string; subs: string[] }, string>;
  reviewLog!: Table<ReviewLogEntry & { id?: number }, number>;
  pomodoroLog!: Table<PomodoroLogEntry & { id?: number }, number>;
  settings!: Table<{ key: string; value: any }, string>;

  constructor() {
    super("MemoriaDB");
    this.version(1).stores({
      cards: "id, category, subcategory, type, createdAt",
      categories: "id, name",
      subcategories: "id, category",
      reviewLog: "++id, cardId, sectionId, timestamp, category",
      pomodoroLog: "++id, timestamp, type",
      settings: "key",
    });
  }
}

export const db = new MemoriaDB();

// ─── Migration: localStorage → IndexedDB (one-time) ─────
const MIGRATION_FLAG = "idb-migrated-v1";

export async function migrateFromLocalStorage(): Promise<void> {
  if (localStorage.getItem(MIGRATION_FLAG)) return;

  try {
    // Cards
    const cardsRaw = localStorage.getItem("sr-essay-cards");
    if (cardsRaw) {
      const cards: Card[] = JSON.parse(cardsRaw);
      if (cards.length > 0) {
        await db.cards.bulkPut(cards);
      }
    }

    // Categories
    const catsRaw = localStorage.getItem("sr-essay-categories");
    if (catsRaw) {
      const cats: string[] = JSON.parse(catsRaw);
      await db.categories.bulkPut(cats.map(name => ({ id: name, name })));
    }

    // Subcategories
    const subsRaw = localStorage.getItem("sr-essay-subcategories");
    if (subsRaw) {
      const subs: Record<string, string[]> = JSON.parse(subsRaw);
      await db.subcategories.bulkPut(
        Object.entries(subs).map(([category, subList]) => ({
          id: category,
          category,
          subs: subList,
        }))
      );
    }

    // Review log
    const logRaw = localStorage.getItem("sr-review-log");
    if (logRaw) {
      const log: ReviewLogEntry[] = JSON.parse(logRaw);
      if (log.length > 0) {
        await db.reviewLog.bulkAdd(log);
      }
    }

    // SR Settings
    const settingsRaw = localStorage.getItem("sr-settings");
    if (settingsRaw) {
      await db.settings.put({ key: "srSettings", value: JSON.parse(settingsRaw) });
    }

    // Pomodoro log
    const pomRaw = localStorage.getItem("sr-pomodoro-log");
    if (pomRaw) {
      const pomLog: PomodoroLogEntry[] = JSON.parse(pomRaw);
      if (pomLog.length > 0) {
        await db.pomodoroLog.bulkAdd(pomLog);
      }
    }

    localStorage.setItem(MIGRATION_FLAG, "1");
    console.log("[MemoriaDB] Migration from localStorage complete");
  } catch (err) {
    console.error("[MemoriaDB] Migration failed, falling back to localStorage", err);
  }
}

// ─── Async storage API ──────────────────────────────────

export async function idbLoadCards(): Promise<Card[]> {
  return db.cards.toArray();
}

export async function idbSaveCards(cards: Card[]): Promise<void> {
  await db.transaction("rw", db.cards, async () => {
    await db.cards.clear();
    await db.cards.bulkPut(cards);
  });
  // Keep localStorage in sync for Electron auto-backup
  try {
    localStorage.setItem("sr-essay-cards", JSON.stringify(cards));
  } catch { /* quota exceeded is OK — IndexedDB is primary now */ }
}

export async function idbPutCard(card: Card): Promise<void> {
  await db.cards.put(card);
}

export async function idbDeleteCard(id: string): Promise<void> {
  await db.cards.delete(id);
}

export async function idbLoadCategories(): Promise<string[]> {
  const rows = await db.categories.toArray();
  return rows.length > 0 ? rows.map(r => r.name) : ["Opšte"];
}

export async function idbSaveCategories(cats: string[]): Promise<void> {
  await db.transaction("rw", db.categories, async () => {
    await db.categories.clear();
    await db.categories.bulkPut(cats.map(name => ({ id: name, name })));
  });
  try { localStorage.setItem("sr-essay-categories", JSON.stringify(cats)); } catch {}
}

export async function idbLoadSubcategories(): Promise<Record<string, string[]>> {
  const rows = await db.subcategories.toArray();
  const result: Record<string, string[]> = {};
  rows.forEach(r => { result[r.category] = r.subs; });
  return result;
}

export async function idbSaveSubcategories(subs: Record<string, string[]>): Promise<void> {
  await db.transaction("rw", db.subcategories, async () => {
    await db.subcategories.clear();
    await db.subcategories.bulkPut(
      Object.entries(subs).map(([category, subList]) => ({ id: category, category, subs: subList }))
    );
  });
  try { localStorage.setItem("sr-essay-subcategories", JSON.stringify(subs)); } catch {}
}

export async function idbLoadReviewLog(): Promise<ReviewLogEntry[]> {
  return db.reviewLog.toArray();
}

export async function idbAddReviewLogEntry(entry: ReviewLogEntry): Promise<void> {
  await db.reviewLog.add(entry);
}

export async function idbLoadSettings<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  return row ? row.value : fallback;
}

export async function idbSaveSettings(key: string, value: any): Promise<void> {
  await db.settings.put({ key, value });
}
