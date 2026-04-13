

# Plan: Onboarding + Info dugmad za Memorizaciju, Konsolidaciju, Mentalne mape i Učenje

## Pregled

Potrebno je unificirani header format (naslov lijevo, Info + Onboarding desno) primijeniti na 4 stranice. Također treba popraviti runtime error sa LearnOnboarding.

---

## Izmjene

### 1. Fix runtime error: LearnOnboarding ima prazne redove na početku fajla
**Fajl:** `src/components/LearnOnboarding.tsx`
- Ukloniti prazne linije 1-3 na početku fajla (moguć uzrok import greške)

### 2. Učenje (ModeSelector) — unificirani header + Info dugme
**Fajl:** `src/components/learn/ModeSelector.tsx`
- Zamijeniti trenutno Onboarding dugme (linije 92-95) sa unificiranijim formatom (manji stil, tekst "Onboarding")
- Dodati InfoPanel pored Onboarding dugmeta sa korisnim info o režimima učenja
- Header format: `flex items-center justify-between` sa Info + Onboarding desno

### 3. Konsolidacija (ReviewSetup) — unificirani header + Info dugme
**Fajl:** `src/components/review/ReviewSetup.tsx`
- Zamijeniti `HowItWorksCorner` komponentu (absolute pozicioniranje) sa inline dugmadima u header redu
- Dodati InfoPanel sa info o konsolidaciji pored Onboarding dugmeta
- Ukloniti `HowItWorksCorner` funkciju

### 4. Memorizacija (MnemonicModule) — unificirani header format
**Fajl:** `src/components/MnemonicModule.tsx`
- Zamijeniti trenutno Onboarding dugme (linije 143-149, veliko `h-5 w-5`) sa unificiranijim formatom (tekst "Onboarding", manji stil)
- Dodati InfoPanel sa info o memorizaciji pored Onboarding dugmeta
- Oba dugmeta u `flex items-center gap-1` kontejneru

### 5. Mentalne mape (MindMapList) — dodati Info + Onboarding
**Fajl:** `src/components/mindmap/MindMapList.tsx`
- Dodati InfoPanel i Onboarding dugme u header red (pored "Nova mapa" dugmeta)
- Kreirati onboarding sadržaj (slides) za mentalne mape

**Novi fajl:** `src/components/mindmap/MindMapOnboarding.tsx`
- Kreirati onboarding sa 3-4 slide-a o mentalnim mapama (hijerarhija vs procedura, čvorovi, veze, eksport)

### 6. MindMapPage — state za onboarding
**Fajl:** `src/views/MindMapPage.tsx`
- Dodati `showOnboarding` state i proslijediti `onShowOnboarding` u MindMapList

---

## Unificirani header pattern (primjenjuje se na sve 4 stranice)

```tsx
<div className="flex items-center justify-between">
  <div>
    <h2>...</h2>
    <p>...</p>
  </div>
  <div className="flex items-center gap-1">
    <InfoPanel title="...">...</InfoPanel>
    <button onClick={onShowOnboarding} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-secondary">
      <HelpCircle className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Onboarding</span>
    </button>
  </div>
</div>
```

## Scope
- 6-7 fajlova, 1 novi fajl (MindMapOnboarding)
- Fix runtime error u LearnOnboarding

