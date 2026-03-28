

# Fix Mnemonic Route & Full Lazy-Load Audit

## Audit Results

### TASK 1: MnemonicPage Crash

The file `src/views/MnemonicPage.tsx` **exists** and has a proper `export default`. The component imports `MnemonicModule` which also exists. The route in `App.tsx` is `/mnemonic` and the sidebar link in `AppSidebar.tsx` also points to `/mnemonic`.

**Root cause**: The user navigated to `/mnemonics` (plural) but the route is `/mnemonic` (singular). This hits the `*` catch-all → `NotFound`, or if the user typed the URL directly after a build, Vite's chunk for MnemonicPage may not resolve. The user wants `/mnemonics` as canonical.

**Fix**: Change the route and sidebar link from `/mnemonic` to `/mnemonics`, and add the old `/mnemonic` as an alias redirect for backwards compatibility.

### TASK 2: Global Lazy-Load Audit — All Clear

Every `lazy(() => import(...))` target verified:

| Lazy Target | File Exists | `export default` | Status |
|---|---|---|---|
| `@/views/DashboardPage` | ✅ | ✅ | OK |
| `@/views/ReviewPage` | ✅ | ✅ | OK |
| `@/views/LearnPage` | ✅ | ✅ | OK |
| `@/views/CreatePage` | ✅ | ✅ | OK |
| `@/views/EditPage` | ✅ | ✅ | OK |
| `@/views/SettingsPage` | ✅ | ✅ | OK |
| `@/views/StatsPage` | ✅ | ✅ | OK |
| `@/views/MnemonicPage` | ✅ | ✅ | OK |
| `@/views/PlannerPage` | ✅ | ✅ | OK |
| `@/views/KnowledgeMapPage` | ✅ | ✅ | OK |
| `@/views/MetacognitivePage` | ✅ | ✅ | OK |
| `@/views/FrequentErrorsPage` | ✅ | ✅ | OK |
| `@/views/MajorSystemPage` | ✅ | ✅ | OK |
| `@/views/CategoriesRoutePage` | ✅ | ✅ | OK |
| `@/views/SpeedReaderPage` | ✅ | ✅ | OK |
| `@/views/MindMapPage` | ✅ | ✅ | OK |
| `@/views/RomanForumPage` | ✅ | ✅ | OK |
| `@/views/CategoryView` | ✅ | ✅ | OK |
| `@/components/DatabaseRecoveryPanel` | ✅ | ✅ | OK |
| `@/components/DocxImporter` | ✅ | ✅ | OK |
| `@/components/GlobalSearch` | ✅ | ✅ | OK |
| `@/components/AppOnboarding` | ✅ | ✅ | OK |
| `@/components/DashboardOnboarding` | ✅ | ✅ | OK |
| `@/components/AutoSplitDialog` | ✅ | ✅ | OK |
| `@/components/LinkToExistingCardModal` | ✅ | ✅ | OK |
| `@/components/MentalSkeleton` | ✅ | ✅ | OK |
| `@/components/SourceSnippetDialog` | ✅ | ✅ | OK |
| `@/components/DashboardChart` | ✅ | ✅ | OK |
| `@/components/RichTextEditor` | ✅ | ✅ | OK |
| `./learn/StudyModeFree` | ✅ | ✅ | OK |
| `./learn/StudyModeRecall` | ✅ | ✅ | OK |
| `./learn/StudyModeChain` | ✅ | ✅ | OK |
| `./stats/OverviewTab` etc. | ✅ | ✅ | OK |

**Dead routes**: No references to deleted `CardsView`, `SourcesView`, or `SourcesRoutePage` remain in the codebase.

**One issue found**: `VIEW_TO_PATH` in `AppContext.tsx` maps `mnemonic: "/mnemonic"` — this must also be updated to `/mnemonics`.

---

## File Changes

| File | Change |
|---|---|
| `src/App.tsx` | Change route `/mnemonic` → `/mnemonics`; add `<Route path="/mnemonic" element={<Navigate to="/mnemonics" replace />} />` |
| `src/components/AppSidebar.tsx` | Change sidebar link from `/mnemonic` to `/mnemonics` |
| `src/contexts/AppContext.tsx` | Update `VIEW_TO_PATH` entry: `mnemonic: "/mnemonics"` |

