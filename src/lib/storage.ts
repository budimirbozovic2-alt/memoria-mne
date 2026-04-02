

export interface ReviewLogEntry {
  timestamp: number;
  cardId: string;
  sectionId: string;
  grade: number;
  category: string;
}

// Pomodoro log
export interface PomodoroLogEntry {
  timestamp: number;
  type: "focus" | "break";
  durationMinutes: number;
}

// Learn session progress persistence
export type LearnMode = "free" | "active-recall" | "chain";

export interface LearnCardProgress {
  mode: LearnMode;
  currentModule: number;
  completedModules: number[];
  chainPosition: number;
  phase: "preview" | "drill" | "learn" | "chainReview";
  completed: boolean;
}

// ─── Generic localStorage helpers ────────────────────────
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Active functions (still used) ───────────────────────

const POMODORO_LOG_KEY = "sr-pomodoro-log";
const LEARN_PROGRESS_KEY = "sr-learn-progress";
const LAST_BACKUP_KEY = "sr-last-backup";

export async function addPomodoroEntry(entry: PomodoroLogEntry): Promise<void> {
  const { db } = await import("@/lib/db");
  await db.pomodoroLog.add(entry);
}

export interface PomodoroStatsResult {
  today: number;
  todayMinutes: number;
  week: number;
  weekMinutes: number;
  total: number;
}

export async function getPomodoroStats(): Promise<PomodoroStatsResult> {
  const { db } = await import("@/lib/db");
  const log = await db.pomodoroLog.toArray();
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const weekStart = todayStart - new Date().getDay() * 86400000;

  const focusSessions = log.filter((e) => e.type === "focus");
  const today = focusSessions.filter((e) => e.timestamp >= todayStart);
  const week = focusSessions.filter((e) => e.timestamp >= weekStart);

  return {
    today: today.length,
    todayMinutes: today.reduce((s, e) => s + e.durationMinutes, 0),
    week: week.length,
    weekMinutes: week.reduce((s, e) => s + e.durationMinutes, 0),
    total: focusSessions.length,
  };
}

export async function loadLearnProgress(): Promise<Record<string, LearnCardProgress>> {
  try {
    const { idbLoadSettings } = await import("@/lib/db");
    const idbData = await idbLoadSettings<Record<string, LearnCardProgress>>(LEARN_PROGRESS_KEY, {});
    if (Object.keys(idbData).length > 0) return idbData;
    // Fallback: migrate from localStorage
    const lsData = loadFromStorage<Record<string, LearnCardProgress>>(LEARN_PROGRESS_KEY, {});
    if (Object.keys(lsData).length > 0) {
      await import("@/lib/db").then(m => m.idbSaveSettings(LEARN_PROGRESS_KEY, lsData));
      localStorage.removeItem(LEARN_PROGRESS_KEY);
    }
    return lsData;
  } catch {
    return loadFromStorage(LEARN_PROGRESS_KEY, {});
  }
}

export async function saveLearnProgress(progress: Record<string, LearnCardProgress>): Promise<void> {
  try {
    const { idbSaveSettings } = await import("@/lib/db");
    await idbSaveSettings(LEARN_PROGRESS_KEY, progress);
  } catch {
    saveToStorage(LEARN_PROGRESS_KEY, progress);
  }
}

// Storage usage (estimates localStorage footprint)
export async function getStorageUsage(): Promise<{ usedBytes: number; maxBytes: number; percent: number }> {
  if (navigator.storage?.estimate) {
    const est = await navigator.storage.estimate();
    const used = est.usage ?? 0;
    const max = est.quota ?? 500 * 1024 * 1024;
    return { usedBytes: used, maxBytes: max, percent: Math.round((used / max) * 100) };
  }
  return { usedBytes: 0, maxBytes: 0, percent: 0 };
}

// Backup reminder
export async function getLastBackupTime(): Promise<number> {
  try {
    const { idbLoadSettings } = await import("@/lib/db");
    const idbVal = await idbLoadSettings<number>(LAST_BACKUP_KEY, 0);
    if (idbVal > 0) return idbVal;
    // Fallback: migrate from localStorage
    const lsVal = loadFromStorage(LAST_BACKUP_KEY, 0);
    if (lsVal > 0) {
      await import("@/lib/db").then(m => m.idbSaveSettings(LAST_BACKUP_KEY, lsVal));
      localStorage.removeItem(LAST_BACKUP_KEY);
    }
    return lsVal;
  } catch {
    return loadFromStorage(LAST_BACKUP_KEY, 0);
  }
}

export async function setLastBackupTime(): Promise<void> {
  const now = Date.now();
  try {
    const { idbSaveSettings } = await import("@/lib/db");
    await idbSaveSettings(LAST_BACKUP_KEY, now);
  } catch {
    saveToStorage(LAST_BACKUP_KEY, now);
  }
}
