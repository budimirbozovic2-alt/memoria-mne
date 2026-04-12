

# Plan: Dodaj preraspoređivanje sekcija u CardForm

## Problem
Ikona GripVertical postoji ali nema funkcionalnost — korisnici ne mogu mijenjati redoslijed cjelina prilikom uređivanja esejskog pitanja.

## Napomena o defaultnom tipu
Kod već koristi `"essay"` kao default tip i prikazuje esejsko dugme prvo. Ako korisnik potvrdi da vidi drugačije ponašanje, istražit ću dalje.

## Izmjene

### Fajl 1: `src/hooks/useCardActions.ts`
- Dodati `moveSection(fromIndex, toIndex)` funkciju koja pomiče sekciju na novu poziciju u nizu
- Eksportovati je iz hook-a

### Fajl 2: `src/components/card-form/EditorSection.tsx`
- Primiti `moveSection` kao prop
- Dodati dugmad za pomjeranje gore/dolje (ChevronUp/ChevronDown) pored GripVertical ikone — isti pattern kao u `SmartSplitSummaryDialog.tsx`
- Dugmad disabled na prvom/zadnjem elementu
- Ukloniti GripVertical ikonu (zamjenjuje se funkcionalnim dugmadima)

### Fajl 3: `src/components/CardForm.tsx`
- Proslijediti `moveSection` iz hook-a u EditorSection komponentu

## Scope
- 3 fajla, ~30 linija izmjena
- Bez rizika — dodaje se nova funkcionalnost bez mijenjanja postojeće logike

