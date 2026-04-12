

# Sticky tab navigacija na Settings stranici

## Problem
Kad korisnik skroluje dolje na Settings stranici, tab navigacija (Algoritam / Personalizacija / Tok rada / Predmeti / Sistem) nestaje sa ekrana i mora se skrolovati nazad da bi promijenio tab.

## Rješenje
Učiniti `TabsList` sticky tako da ostaje vidljiv na vrhu dok korisnik skroluje sadržaj taba.

## Izmjena

### Fajl: `src/components/SRSettingsPanel.tsx`
- Dodati `sticky top-0 z-10 bg-background py-2` na `TabsList` wrapper
- Omotati `TabsList` u `div` sa sticky pozicioniranjem i pozadinskom bojom da sadržaj ispod ne proviruje

Konkretno, linije 81-93 se mijenjaju u:
```tsx
<div className="sticky top-0 z-10 bg-background pb-4 -mx-1 px-1">
  <TabsList className="grid w-full grid-cols-5">
    {/* ...existing triggers... */}
  </TabsList>
</div>
```

Uklanja se `mb-6` sa TabsList (padding preuzima wrapper div).

## Scope
- 1 fajl, ~5 linija izmjena
- Bez rizika — čisto CSS pozicioniranje

