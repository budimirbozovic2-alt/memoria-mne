// M1+A1 — Settings repository facade.
import { idbSaveSettings, idbLoadSettings } from "@/lib/db";

export const settingsRepository = {
  async load<T>(key: string, fallback: T): Promise<T> {
    return idbLoadSettings<T>(key, fallback);
  },
  async save(key: string, value: unknown): Promise<void> {
    return idbSaveSettings(key, value);
  },
};
