

# Uklanjanje trackova + premještanje dugmeta "Članovi"

## 1. Ukloni lofi, brown noise i space drone

### `src/lib/ambient-audio.ts`
- Ukloniti `"brown"`, `"lofi"`, `"space"` iz `AmbientTrack` union tipa
- Ukloniti ta 3 zapisa iz `AMBIENT_TRACKS` niza
- Ukloniti funkcije `createBrownBuffer`, `createLofiBuffer`, `createSpaceBuffer`
- Ukloniti njihove `case` grane iz `getBuffer` switch-a
- Ukloniti backward-compatible aliase na dnu (`startBrownNoise`, `stopBrownNoise`, `setBrownNoiseVolume`, `isBrownNoisePlaying`)

Preostali trackovi: Rain, Forest, Cafe, Piano (4 komada).

## 2. Premjesti dugme "Članovi" u edit mode

### `src/components/source-reader/SourceToolbar.tsx`
- Maknuti `onAutoFormat` dugme iz `{!editMode && ...}` bloka (L43-56)
- Dodati ga u novi `{editMode && ...}` blok, npr. odmah nakon "Uređivanje" dugmeta (nakon L105)

## Fajlovi

| Fajl | Promjena |
|------|----------|
| `src/lib/ambient-audio.ts` | Ukloniti 3 tracka + aliase |
| `src/components/source-reader/SourceToolbar.tsx` | Premjestiti "Članovi" u editMode blok |

## Scope
- 2 fajla, ~80 linija uklonjeno, ~5 premješteno

