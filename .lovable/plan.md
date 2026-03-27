

# Diagnostic: Eternal Loading Screen in Web Preview

## Root Cause Analysis

The splash screen (`#app-splash`) is rendered inside `#root` in `index.html` with `position: fixed; z-index: 9999`. Three mechanisms should remove it:

1. **`main.tsx` line 49**: `setTimeout(hideSplashImmediately, 8000)` — but this is inside a `<script type="module">`. If the module fails to load/parse (e.g., transient network issue, sandbox restriction), this timer never gets registered.
2. **`useCardBootstrap.ts` finally block**: removes splash after DB init — but only runs if React mounted successfully.
3. **`useCardBootstrap.ts` panic timer (8s)**: same dependency — React must have mounted.

**Critical gap**: There is NO fallback that works if the ES module itself fails to load. The splash persists forever.

**Secondary issue**: `window.onunhandledrejection` (main.tsx line 39-42) calls `showFatalBootError` which replaces `#root.innerHTML` with an error page. ANY stray unhandled rejection (e.g., failed lazy import, failed fetch, sandbox quirk) during the boot window nukes the React tree before it can mount. In some cases the error page itself may look like a "stuck" state.

## Fix (3 files)

### 1. `index.html` — Add non-module splash safety timer
Add a plain `<script>` tag (NOT `type="module"`) before the module script. This executes synchronously and guarantees the timer is registered regardless of whether ES modules load:
```html
<script>
setTimeout(function(){
  var s=document.getElementById("app-splash");
  if(s){s.style.transition="opacity 0.3s";s.style.opacity="0";setTimeout(function(){if(s.parentNode)s.remove()},400);}
},10000);
</script>
```

### 2. `main.tsx` — Make unhandledrejection handler non-destructive
The current handler destroys the entire `#root` innerHTML on ANY rejection. Change it to only log during the critical window, and only show fatal error if the bootstrap async block itself fails (which is already caught in the try/catch):

Replace destructive `window.onunhandledrejection` (line 39-42) with a version that only logs but does NOT call `showFatalBootError`. The actual bootstrap error is caught by the try/catch at line 72. Keep `window.onerror` as-is (synchronous errors are truly fatal).

### 3. `useCardBootstrap.ts` — No changes needed
The existing panic timer (8s) and finally block are correct. They both call `setReady(true)` and remove splash.

## What stays untouched
- `MainLayout.tsx` — no changes
- FSRS/SM-2 logic — not involved
- Electron IPC calls — already guarded with `if (window.electronAPI)`
- `boot-trace.ts` — no changes
- `db.ts` / `ensureDbOpen` timeout logic — already correct

## Execution
Single response — two small file edits (index.html + main.tsx).

