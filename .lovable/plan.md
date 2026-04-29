## Cilj

Dodati automatizovan test koji garantuje da `src/views/CategoryView.tsx` renderuje **isključivo** `SourcesTab`, i da se "Mapa znanja" (MindMap*) i "Struktura" (MentalSkeleton / StructureManager) više nikad ne pojave u ovoj view — u skladu sa odlukom iz `mem://architecture/knowledge-map-restructuring`.

## Pristup

Umjesto klasičnog mount/render testa preko `@testing-library/react` (koji bi povukao Dexie, AppContext, react-router i mock-ove za sve njih), pišem **statički contract test** nad izvornim kodom datoteke. Razlozi:

- Brži, deterministički, bez mockovanja IDB-a.
- Hvata regresiju tačno na sloju gdje bi se desila: `import` ili JSX tag.
- Otporan na refaktor unutrašnjosti komponente.

Postojeći test setup (`vitest`, `src/test/setup.ts`) je već prisutan — nema novih zavisnosti.

## Datoteka

**Nova: `src/test/category-view-contract.test.ts`**

Test čita `CategoryView.tsx` kao tekst, skida komentare (da prose poput "Mapa znanja & Struktura moved to ..." ne pravi false-positive), i provjerava 5 invarijanti:

1. **Pozitivna**: postoji `import SourcesTab from "@/components/category/SourcesTab"`.
2. **Pozitivna**: u JSX-u se pojavljuje `<SourcesTab ...>`.
3. **Negativna (import sloj)**: ni jedan `import` ne sadrži `MindMap`, `MentalSkeleton`, `StructureManager`, `StructureTab`, `KnowledgeMap`, `MapaZnanja`. Provjera se vrši samo nad `import` linijama (da se ne pomiješa sa stringovima drugdje).
4. **Negativna (JSX sloj)**: nigdje u datoteci nema `<MindMap*`, `<MentalSkeleton*`, `<Structure*`, `<KnowledgeMap*` — defence-in-depth ako neko aliasira import.
5. **Strukturna**: postoji tačno jedan `*Tab` JSX element u cijeloj datoteci, i to je `SourcesTab`. Ovo automatski hvata bilo koji budući `MindMapTab`, `StructureTab`, `MentalMapTab` itd. čak i ako mu ime ne pogađa eksplicitnu listu.

## Tehnički detalji

- `readFileSync(resolve(__dirname, "../views/CategoryView.tsx"), "utf8")` — direktan pristup izvoru.
- Skidanje komentara: dva regexa za blok i line komentare.
- `it.each(...)` za parametrizovane assertione po svakoj zabranjenoj riječi i JSX patternu.
- Bez novih dev-dependencies, bez izmjene `vitest.config.ts`, bez novih test setup hookova.

## Verifikacija

Nakon kreiranja, test se pokreće kroz postojeći Vitest setup (`bunx vitest run src/test/category-view-contract.test.ts`). Očekivano: svih 5 grupa assertiona prolazi za trenutni `CategoryView.tsx`.

Ručno verifikujem da test **fail-uje** ako neko u budućnosti doda npr. `import MindMapTab from "..."` ili `<MentalSkeletonTab />`.
