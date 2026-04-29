/**
 * Minimalna shema backupa potrebna za remap zastarjelih veza
 * (subcategoryId / chapterId) na osnovu imena.
 */

export interface BackupChap {
  id: string;
  name: string;
}

export interface BackupSub {
  id: string;
  name: string;
  chapters?: BackupChap[];
}

export interface BackupCategory {
  id: string;
  name: string;
  subcategories?: BackupSub[];
}

export interface BackupCard {
  id: string;
  categoryId?: string;
  subcategoryId?: string;
  chapterId?: string;
}

export interface MinimalBackup {
  categories: BackupCategory[];
  cards: BackupCard[];
  type?: string;
  version?: number;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function isMinimalBackup(json: unknown): json is MinimalBackup {
  if (!isObj(json)) return false;
  if (!Array.isArray(json.categories) || !Array.isArray(json.cards)) return false;
  // sanity: prva kategorija ima id+name
  if (json.categories.length > 0) {
    const c = json.categories[0];
    if (!isObj(c) || typeof c.id !== "string" || typeof c.name !== "string") return false;
  }
  // sanity: prva kartica ima id
  if (json.cards.length > 0) {
    const c = json.cards[0];
    if (!isObj(c) || typeof c.id !== "string") return false;
  }
  return true;
}

export function normalizeName(s: string | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}
