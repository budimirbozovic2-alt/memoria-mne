

# Desktop UI Cleanup — Stale Links, Breadcrumbs, Glass-Card, ReviewCard

## 6 surgical edits, all CSS/className/JSX only

### 1. Fix stale `/database` links

**`src/components/dashboard/CoreStats.tsx` line 24**
Change `<Link to="/database">` → `<Link to="/cards">`

**`src/components/dashboard/QuickActions.tsx` lines 30-34**
Replace:
```jsx
<Link to="/database"
  onClick={() => {
    sessionStorage.setItem("sr-database-tab", "sources");
  }}
  className="...">
```
With:
```jsx
<Link to="/sources"
  className="...">
```
(Remove the onClick + sessionStorage setter entirely)

**`src/components/CardForm.tsx` lines 43-45**
Replace:
```js
sessionStorage.setItem("sr-open-source-id", editCard.sourceId!);
sessionStorage.setItem("sr-database-tab", "sources");
window.location.hash = "/database";
```
With:
```js
sessionStorage.setItem("sr-open-source-id", editCard.sourceId!);
window.location.hash = "#/sources";
```

### 2. Breadcrumbs full-width for source routes

**`src/components/Breadcrumbs.tsx` line 50**
Replace the static `max-w-6xl` with conditional logic:
```jsx
<nav className={`flex items-center gap-1 px-4 md:px-8 pt-2 mx-auto w-full text-xs text-muted-foreground ${
  ["/cards", "/categories", "/sources", "/source-registry"].includes(pathname) ? "max-w-none" : "max-w-6xl"
}`}>
```

### 3. Glass-card border radius bump

**`src/index.css` line 691**
Change `border-radius: var(--radius);` → `border-radius: calc(var(--radius) + 4px);`

### 4. ReviewCard section padding

**`src/components/review/ReviewCard.tsx` line 217**
Change `p-8` → `p-5`

## Files touched
| File | Change |
|------|--------|
| `CoreStats.tsx` | `/database` → `/cards` |
| `QuickActions.tsx` | `/database` → `/sources`, remove sessionStorage |
| `CardForm.tsx` | hash nav → `#/sources` |
| `Breadcrumbs.tsx` | Conditional `max-w-none` for source routes |
| `index.css` | glass-card radius bump |
| `ReviewCard.tsx` | `p-8` → `p-5` |

Zero logic/hook/handler changes. Desktop only.

