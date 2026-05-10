## Cilj

Kozmetičko čišćenje `src/views/SubjectCardsView.tsx` (~395 LOC) ekstrakcijom dva čisto prezentaciona JSX bloka u zasebne "dumb" komponente. **Nikakva poslovna logika, hook-ovi, state ili efekti se ne diraju** — samo se JSX preseljava i prosljeđuju props-ovi.

## Nove komponente

### 1. `src/views/subject-cards/SubjectHeader.tsx` (~70 LOC)

Preuzima cijeli `<div className="flex items-center gap-3">` blok — od `<Link>` (Nazad) do desnog "Nazad na uređivanje" dugmeta.

**Props (čisto podaci + callback-ovi, bez konteksta):**
```ts
interface SubjectHeaderProps {
  categoryId: string;
  categoryName: string;
  essayCount: number;
  flashCount: number;
  tab: "manage" | "read" | "speed";
  onBackToManage: () => void;
  // Slot za "Dodaj" dugme — render-prop da SubjectCardsView zadrži CardCreateMenu
  // sa svim svojim akcijama netaknutim:
  createMenuSlot?: React.ReactNode;
}
```

`CardCreateMenu` se renderuje u parent-u i prosljeđuje kao `createMenuSlot` (jer ima 6+ akcija/callback-ova vezanih za context — nema smisla pumpati ih kroz props).

### 2. `src/views/subject-cards/ManageModeToolbar.tsx` (~45 LOC)

Preuzima `<div className="flex items-center justify-between gap-2 flex-wrap">` blok unutar `TabsContent value="manage"` — segmentirani prekidač Edit↔Structure + dugme "Uredi potkategorije i glave".

**Props:**
```ts
interface ManageModeToolbarProps {
  manageMode: ManageMode;
  onChangeMode: (m: ManageMode) => void;
  onOpenStructure: () => void;
}
```

`MANAGE_MODES` i `MANAGE_MODE` ostaju import iz postojećeg `manageModes.ts`.

## SubjectCardsView nakon refaktora

- Sve `useState`, `useMemo`, `useCallback`, `useEditReturn`, context hook-ovi ostaju **identično** gdje su sada.
- Render se skraćuje: header blok → `<SubjectHeader ... createMenuSlot={tab === "manage" ? <CardCreateMenu .../> : null} />`.
- Manage toolbar → `<ManageModeToolbar manageMode={manageMode} onChangeMode={setManageMode} onOpenStructure={() => setStructureOpen(true)} />`.
- Procijenjeno smanjenje: ~395 → ~270 LOC u glavnom fajlu.

## Garancije

- Identičan DOM i klase (copy-paste JSX-a, samo zamjena lokalnih varijabli props-ovima).
- Identično ponašanje tab-ova, edit-return stash-a, structure dialoga.
- Bez izmjena u `AppContext`-u, hook-ovima ili `manageModes.ts`.
- TypeScript build kao verifikacija.

## Procjena

B− → A− (čisto čitljivost). Hook-ovi i orkestracija ostaju u `SubjectCardsView`, prezentacija se izvlači.
