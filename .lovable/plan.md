

# Rebuild & Test Electron App

## Overview
Build the Vite project, package with `@electron/packager`, and verify the app launches past the splash screen.

## Steps

### 1. Build Vite production bundle
```bash
cd /dev-server && npx vite build
```

### 2. Install Electron + Packager
```bash
cd /dev-server && npm install --save-dev electron @electron/packager
```

### 3. Package for Linux
```bash
cd /dev-server && npx @electron/packager . "Memoria" \
  --platform=linux --arch=x64 \
  --out=electron-release --overwrite \
  --ignore='node_modules' \
  --ignore='^/src' --ignore='^/public' \
  --ignore='^/electron-release'
```

### 4. Archive for download
```bash
tar czf /mnt/documents/Memoria-linux-x64.tar.gz -C /dev-server/electron-release Memoria-linux-x64/
```

### 5. Verify fixes are in place (pre-build checklist)
Before building, confirm these 4 fixes are active in the current code:
- `vite.config.ts`: `base: './'` and no `manualChunks` (just `emptyOutDir: true`)
- `main.cjs`: CSP skips `file://` URLs
- `src/main.tsx`: SW registration skipped when `electronAPI` present
- `electron/window.cjs`: `webSecurity: false` in webPreferences

### What this tests
The eternal loading screen was caused by CSP blocking dynamic imports under `file://`, SW registration crashing, and potential rollup chunking TDZ errors. All three have been patched. A successful launch past the splash screen confirms the fix.

