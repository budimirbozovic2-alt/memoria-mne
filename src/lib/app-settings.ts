const APP_SETTINGS_KEY = "sr-app-settings";

export interface DashboardWidgetConfig {
  showExamProgress: boolean;
  showCoreStats: boolean;
  showBriefing: boolean;
  showIdealFocus: boolean;
  showVelocity: boolean;
  showWeakCategories: boolean;
  showStatusIcons: boolean;
}

export interface AppSettings {
  targetRetention: number; // 0.85 - 0.99
  autoBackupDays: number; // 0 = disabled, otherwise N days
  soundEffects: boolean;
  dashboardWidgets: DashboardWidgetConfig;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  targetRetention: 0.95,
  autoBackupDays: 7,
  soundEffects: false,
  dashboardWidgets: {
    showExamProgress: true,
    showCoreStats: true,
    showBriefing: true,
    showIdealFocus: true,
    showVelocity: true,
    showWeakCategories: true,
    showStatusIcons: true,
  },
};

export function loadAppSettings(): AppSettings {
  try {
    const data = localStorage.getItem(APP_SETTINGS_KEY);
    if (!data) return { ...DEFAULT_APP_SETTINGS };
    const parsed = JSON.parse(data);
    return {
      ...DEFAULT_APP_SETTINGS,
      ...parsed,
      dashboardWidgets: { ...DEFAULT_APP_SETTINGS.dashboardWidgets, ...parsed.dashboardWidgets },
    };
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function saveAppSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

export function isAutoBackupOverdue(settings: AppSettings): boolean {
  if (settings.autoBackupDays <= 0) return false;
  const lastBackupStr = localStorage.getItem("sr-last-backup");
  if (!lastBackupStr) return false; // don't nag on first use
  const last = JSON.parse(lastBackupStr);
  if (!last || last === 0) return false;
  return Date.now() - last > settings.autoBackupDays * 24 * 60 * 60 * 1000;
}
