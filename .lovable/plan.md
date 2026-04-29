## Cilj

Modernizovati UI/UX **Konsolidacije znanja** (ReviewSetup + ReviewCard) po ugledu na čist, fokusiran tok **Aktivnog prisjećanja** (StudyModeRecall): manji vizuelni šum, jasna progresija, nenametljive metainfo, dosljedne ikone i razmaci.

## A) ReviewSetup — uprošćen mode picker

**`src/components/review/ReviewSetup.tsx`**

Trenutno: dva koraka (mode → filter), banner "Saved session", `glass-card` kartice sa `bg-${color}` dinamičkim klasama, opširni opisi.

Novo (jedan ekran, kao FilterSetup u Active Recall):

```
[Header]
  ← Nazad     Konsolidacija znanja          [? Onboarding]
  "Izaberi pristup ponavljanju za ovu sesiju."

[Locked subject pill]   (samo ako lockedCategory)
  🔒 Predmet: Krivično pravo

[Resume banner]   (samo ako savedSession)
  ▶ Nastavi prethodnu sesiju · Mod: Kritični pregled
  [Nastavi]  [×]

[3 mode cards — radio-style, kompaktne]
  ○ Fokusirano utvrđivanje · X sekcija
    Cilja svježe i nedavno pogrešene kartice.
  ● Kritični pregled · X sekcija         ← default selected
    Hvata kartice na granici zaborava (R 80–85%).
  ○ Najteža pitanja · X sekcija
    Leech kartice + visoka težina (do 50).

[Filter sažetak]   (collapsible, sakriven po default-u)
  ▸ Filteri: Sve subkategorije · Sve poglavlja · Sve česte

[Start dugme — full width, primary]
  ▶ Počni konsolidaciju (X sekcija)
```

Implementacija:
- Ukloniti dva koraka — sve na jednom ekranu.
- Mode kartice koriste **semantički token color** (`text-primary`, `text-warning`, `text-destructive` direktno preko `cva`-style varianti, **ne** dinamički `bg-${color}` koji Tailwind ne pokupi pouzdano).
- Selekcija moda: jedan klik bira, drugi klik na "Počni" pokreće. Default: `critical`.
- Onboarding ostaje, samo dugme "?" u headeru.
- Filteri (`SessionFilters`) ostaju **kao collapsible sekcija** (`details/summary` ili `<Collapsible>` iz shadcn-a) — sakriveni dok korisnik ne želi suziti opseg. Ako je `lockedCategory` aktivno, filteri su disabled za kategoriju (postojeća logika).

## B) ReviewCard — fokusiran review tok

**`src/components/review/ReviewCard.tsx`**

Cilj: vizuelno blizu `StudyModeRecall` — header sa kategorijom/brojem/širinom + question card + stanje (skriveno/otkriveno) + dugmad ocjena.

Promjene:

1. **Header sređen** — koristiti istu strukturu kao `SessionHeader` u StudyModeRecall:
   - lijevo: `← Nazad` + `⏸ Pauza`
   - desno: mode badge + width selector + `progress/total` + `?