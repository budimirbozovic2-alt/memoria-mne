

# Povećanje centralne figure na ikonici aplikacije

## Problem
Centralni simbol (zlatni kodeks) unutar teget-plavog kruga je premali i teško se raspoznaje, naročito na manjim veličinama (favicon, taskbar).

## Rješenje
Programski generisati novu verziju svih ikonica koristeći Python (Pillow):
1. Učitati postojeći `logo-icon.png`
2. Izrezati centralnu figuru (crop sadržaj bez okružujućeg padding-a)
3. Ponovo je postaviti na teget-plavi kružni pozadinski sloj, ali sa značajno manje padding-a (~10-12% umjesto trenutnih ~25-30%)
4. Generisati sve potrebne veličine: `logo-icon.png`, `favicon.png`, `icon-64.png`, `icon-192.png`, `icon-256.png`, `icon-512.png`
5. Konvertovati `favicon.png` u `favicon.ico`

## Fajlovi koji se ažuriraju
- `public/logo-icon.png` — glavna ikonica (koristi se u sidebar, title bar, splash)
- `public/favicon.png` — browser tab
- `public/icon-64.png`, `icon-192.png`, `icon-256.png`, `icon-512.png` — PWA/manifest ikone
- `public/favicon.ico` — fallback

## Pristup
- Koristiću Pillow da analiziram bounding box centralne figure i zatim je rescale-ujem da zauzima ~80% prečnika kruga umjesto trenutnih ~50-55%
- Pozadinska boja ostaje ista (midnight navy `#0a1628`)
- Oblik ostaje kružni

