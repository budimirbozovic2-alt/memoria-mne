## Tri uklanjanja

### 1. Pasivno čitanje — ukloniti dugmad "Izvor" i "Mapa uma"

`src/components/subject-cards/PassiveReader.tsx`:
- Ukloniti cijeli blok sa `TooltipProvider`+"Izvor" i Button "Mapa uma" (linije ~262-294). Zadržati samo "Uredi karticu" u istom redu.
- Ukloniti svu pripadajuću logiku: `sidePanel` state, `setSidePanel`, `linkedSource`, `sourceLoading`, `getSource` lazy-load `useEffect`, `sourceDisabled`, `showSidePanel`, render-blok za side-panel column (linije 406-429), grid `lg:grid-cols-2` se uvijek vraća na `grid-cols-1`.
- Skinuti unused importe: `FileText`, `MapIcon`, `Tooltip*`, `getSource`, `SourceSidePanel`, `MindMapSidePanel`, `Source` tip, `SidePanel` tip.

### 2. Konsolidacija — ukloniti "Procjena sigurnosti" prije reveal-a

Jedini element u `ReviewCard` koji se prikazuje prije otkrivanja odgovora i nudi FSRS procjenu/objašnjenje je **`AdaptiveReasonPanel`** ("Zašto ovaj interval?"). Ukloniti njegov render (linije 237-244) i import. Komponenta `AdaptiveReasonPanel.tsx` ostaje u kodu (može se kasnije koristiti drugdje), ali se više ne mounta u Konsolidaciji.

> Ako si mislio na nešto drugo (npr. FSRS metrike u zaglavlju kartice — Stabilnost/Težina/Interval), reci pa ćemo ukloniti i to.

### 3. Aktivno prisjećanje — ukloniti TTS dugme za pitanje

`src/components/learn/SessionHeader.tsx`:
- Ukloniti `<button onClick={() => speak(card.question)}>` sa `Volume2` ikonom (linije 96-98) — ostaje samo `<p>{card.question}</p>` u flex kontejneru.
- Skinuti `Volume2` import iz `lucide-react` i `speak` import iz `@/lib/tts` ako više nigdje nisu korišteni u fajlu.

## Fajlovi koji se mijenjaju

- `src/components/subject-cards/PassiveReader.tsx` — uklanjanje side-panel toggle-a i sve prateće logike/importa.
- `src/components/review/ReviewCard.tsx` — uklanjanje `AdaptiveReasonPanel` rendera + importa.
- `src/components/learn/SessionHeader.tsx` — uklanjanje TTS dugmeta + importa `Volume2`/`speak`.

Nema novih komponenti niti promjene API-ja.
