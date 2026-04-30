## UX/UI Sweep — Revised Plan (per user feedback)

User feedback: "Uredi karticu" u **PassiveReader ostaje** (legitiman intent — pasivno čitanje često otkrije grešku koju treba odmah popraviti). Brišemo samo iz **LocalSpeedReader** (RSVP režim je čisti drill, bez uvida za uređivanje). Ostale izmjene prihvaćene u potpunosti.

---

### 1. Cross-domain "Uredi karticu" — samo u LocalSpeedReader

| File | Lines | Action |
|---|---|---|
| `src/components/subject-cards/LocalSpeedReader.tsx` | **410–423** | Delete entire `{current && onEditCard && (<div>… Uredi karticu …</div>)}` block |
| `src/components/subject-cards/LocalSpeedReader.tsx` | **29** | Remove `onEditCard?: (card: Card) => void` from `Props` |
| `src/components/subject-cards/LocalSpeedReader.tsx` | **67** | Remove `onEditCard` from destructured signature |
| `src/components/subject-cards/LocalSpeedReader.tsx` | **3** | Remove `Pencil` from `lucide-react` import |
| `src/views/SubjectCardsView.tsx` | **356** | Remove `onEditCard={handleEdit}` from `<LocalSpeedReader>` |

`PassiveReader` and its prop-chain (`SubjectCardsView.tsx:345`) remain untouched.

---

### 2. Redundant "Locked subject" pill in ReviewSetup

| File | Lines | Action |
|---|---|---|
| `src/components/review/ReviewSetup.tsx` | **239–247** | Delete the `<Lock/> Predmet: {lockedCategoryName}` pill block |
| `src/components/review/ReviewSetup.tsx` | **158–161** | Delete now-unused `lockedCategoryName` `useMemo` |
| `src/components/review/ReviewSetup.tsx` | **1** | Remove `Lock` from `lucide-react` import |

`lockedCategory` prop itself is preserved — still drives `selectedCategory` (line 107) and downstream scoping.

---

### 3. Obsolete FSRS-scope notice in stabilization mode

| File | Lines | Action |
|---|---|---|
| `src/components/review/ReviewSetup.tsx` | **310–318** | Delete the `{mode === "stabilization" && (…)}` notice block |
| `src/components/review/ReviewSetup.tsx` | **1** | Remove `Info` from `lucide-react` import |

`<InfoPanel>` (lines 188–193) already covers mode descriptions for users who want context.

---

### 4. Stale "Globalna konsolidacija" comments

| File | Lines | Action |
|---|---|---|
| `src/components/ReviewSession.tsx` | **87–89** | Rewrite comment → `// Auto-start in a specific mode when the caller passes ?mode=… via the URL, skipping ReviewSetup entirely.` |
| `src/components/review/review-constants.ts` | **44–46** | Rewrite JSDoc on `autoMode` to match (no mention of removed global dashboard shortcut) |

Behavior unchanged; prop kept.

---

### 5. Stale "globalna pretraga" copy

| File | Line | Old → New |
|---|---|---|
| `src/components/AppOnboarding.tsx` | **103** | `"Ctrl+K — brza globalna pretraga"` → `"Ctrl+K — brza pretraga kartica"` |
| `src/components/StrategicPlanner.tsx` | **58** | `<span>Globalna pretraga</span>` → `<span>Brza pretraga</span>` |
| `src/components/MyStats.tsx` | **67** | `<span>Globalna pretraga</span>` → `<span>Brza pretraga</span>` |

---

## Execution order

1. LocalSpeedReader edit-button removal + prop chain (5 edits, 2 files)
2. ReviewSetup pill + FSRS notice + Lock/Info imports (1 file, 3 trims)
3. Comment rewrites in ReviewSession + review-constants (2 files)
4. Onboarding/help string updates (3 files, 1 line each)

No cross-batch dependencies. No memory file updates required (none of the affected behaviors are memorized rules).
