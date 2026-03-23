// Electron API type declarations for the renderer process
// Exposed via preload.cjs through contextBridge

export interface BackupInfo {
  backupDir: string;
  files: { name: string; time: number; size: number }[];
  lastAutoBackup: number;
}

export interface ElectronAPI {
  requestBackup: (jsonData: string) => Promise<boolean>;
  getAppVersion: () => Promise<string>;
  getBackupInfo: () => Promise<BackupInfo>;
  notifyReady: () => void;
  onBackupRequested: (callback: () => void) => () => void;
  isElectron: true;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
