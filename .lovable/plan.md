

# Hirurško uklanjanje 3D Foruma — zadržavanje Mape Znanja

## Rezime
Brišemo sve Forum/gamification komponente, rutu, kontekst, i tranziciju. Čistimo reference u Dashboard, TopNav, AppSidebar, CategoryManager, App.tsx i useCardImport. Mapa Znanja ostaje netaknuta.

---

## Fajlovi za BRISANJE (9 fajlova)

| Fajl | Razlog |
|------|--------|
| `src/components/gamification/ForumAtmosphere.tsx` | 3D ambijent gradient |
| `src/components/gamification/ForumContext.tsx` | Forum unlock/transition kontekst |
| `src/components/gamification/ForumTransition.tsx` | Fade-to-black tranzicija |
| `src/components/gamification/MonumentCard.tsx` | Kartica spomenika |
| `src/components/gamification/MonumentInterior.tsx` | Unutrašnjost spomenika |
| `src/components/gamification/ArchNode.tsx` | Hijerarhijski čvor |
| `src/components/gamification/monument-buildings.tsx` | 10 SVG zgrada |
| `src/components/gamification/monument-svg.tsx` | SVG primitivi |
| `src/components/gamification/monument-effects.tsx` | Pukotine/bršljan efekti |
| `src/views/RomanForumPage.tsx` | Forum stranica |

Napomena: `src/lib/forum-logic.ts` se NE briše u ovom koraku jer ga `CategoryManager` i `useCardImport` koriste za `loadMonumentTypes` / `saveMonumentType` / `invalidateMonumentTypesCache`. Čistimo ga od nepotrebnih eksporta, ali zadržavamo monument-type persistence jer je to user preference podatak (koji tip zgrade je korisnik odabrao za kategoriju).

---

## Fajlovi za IZMJENU (6 fajlova, ~50 linija)

### 1. `src/App.tsx`
- Obriši import `ForumProvider`, `ForumTransition`, `RomanForumPage`
- Obriši `<ForumProvider>` wrapper i `<ForumTransition />`
- Obriši `<Route path="/forum" ...>` liniju

### 2. `src/components/TopNav.tsx`
- Obriši import `useForumContext`
- Obriši `const { enterForum, unlocked: forumUnlocked } = useForumContext()`
- Obriši cijelu `_handleBrandClick` / `_handleThemeSeq` / `_seqRef` / `_resetSeq` logiku (easter egg za otključavanje Foruma)
- Obriši Forum link ikonu (L204-209: `forumUnlocked && <Link to="/forum">`)
- `toggleDark` više ne poziva `_handleThemeSeq` — samo `setDarkState + setDarkMode`

### 3. `src/components/Dashboard.tsx`
- Obriši import `useForumContext`, `Link`, `Landmark`
- Obriši `const { unlocked } = useForumContext()`
- Obriši cijeli blok L117-131 (`unlocked && <Link to="/forum">...`)

### 4. `src/components/AppSidebar.tsx`
- Ukloni `{ path: "/forum", icon: Landmark, label: "Forum" }` iz `STATIC_NAV`
- Ukloni `Landmark` iz lucide importa

### 5. `src/components/CategoryManager.tsx`
- Ukloni import `BuildingType` iz `forum-logic`
- Ukloni import `loadMonumentTypes`, `saveMonumentType`
- Ukloni import `BUILDING_LABELS`, `MonumentSVG` iz `monument-buildings`
- Ukloni `ALL_BUILDING_TYPES` konstantu
- Ukloni `monumentTypes` state i `handleSetBuildingType`
- Ukloni cijeli "Building type picker" `<Popover>` blok (L157-187)
- Ukloni `Landmark` iz lucide importa

### 6. `src/hooks/useCardImport.ts`
- Ukloni L252-253: `invalidateMonumentTypesCache()` poziv nakon importa (čista dead code referenca)

---

## Šta se NE dira
- `src/components/KnowledgeMap.tsx` — glavni navigator, ostaje 100%
- `src/lib/forum-logic.ts` — zadržavamo za sada (monument-type localStorage persistence), čisti se u zasebnom koraku ako/kad odlučimo
- `src/test/construction-phases.test.ts` — test za forum-logic, može ostati ili se obrisati; nije kritičan
- FSRS logika, CSS/styling: netaknuto
- Nema novih zavisnosti, nema schema promjena

## Scope
- 10 fajlova za brisanje, 6 za izmjenu
- ~50 linija promjena u izmijenjenim fajlovima
- Netto: značajno smanjenje bundle-a (SVG zgrade, framer-motion animacije, gradient shader)

