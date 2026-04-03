

# Fix: Zamjena loših ambijentalnih trackova boljim proceduralnim zvukovima

## Problem
Trackovi rain, forest, lofi, cafe i space zvuče loše — previše statičan šum, sintetički klikovi, nečujan sub-bass. Piano je OK i ostaje nepromijenjen.

## Rješenje — potpuno prepisati 5 generatora

### Fajl: `src/lib/ambient-audio.ts`

**Rain** — trenutno: jedan low-pass + random klikovi. Novo:
- Stereo buffer (2 kanala) za prostorni efekat
- Tri kaskadna low-pass filtera za gušći, mekši zvuk kiše
- Umjesto oštrih klikova, koristiti kratke filtered-noise burst-ove za kapljice sa envelope fadeout
- Duži buffer (5s) za prirodniji loop

**Forest** — trenutno: rumble + sinusni chirp. Novo:
- Mekši wind: višestruki LP filteri sa sporom modulacijom amplitude (breathing effect)
- Chirps: FM sinteza umjesto čistog sinusa — frekvencija klizi gore-dolje (realniji ptičji zvuk)
- Dodatni sloj: tihi "rustle" (high-passed noise bursts) za lišće
- Duži buffer (6s)

**Lofi** — trenutno: goli sinusi na 60/90/120 Hz = čujna frekvencija. Novo:
- Zamijeniti čiste sinuse sa filtered brown noise (topao, neodređen hum)
- Dodati wow/flutter efekt (spora sinusoidna modulacija pitch-a) za vinyl karakter
- Crackle: umjesto random impulsa, koristiti kratke eksponencijalno-decaying klikove
- Tihi pad od layeranih filtriranih sinusa sa detune za warmth

**Cafe** — trenutno: LP noise + ping. Novo:
- Dva nezavisna murmur sloja (različiti LP koeficijenti) za dubinu
- Sporija amplitudna modulacija na murmuru (simulira razgovor koji raste i pada)
- Clink: koristiti eksponencijalno-decaying sinus sa laganim frequency sweep za realističniju čašu
- Manji volume ratio između murmura i efekata

**Space** — trenutno: sub-bass sinusi (nečujni na većini zvučnika). Novo:
- Podići fundamentale na 80-150 Hz range (čujno na laptop zvučnicima)
- Dodati reverb-like sloj: dugački filtered noise tail
- Koristiti FM sinteza za shimmer umjesto čistih sinusa
- Spora amplitude modulation za "pulsiranje" svemirskog drona

### Što se NE mijenja
- Brown noise — radi dobro
- Piano — korisnik kaže da zvuči OK
- API (`startAmbient`, `stopAmbient`, itd.) — potpuno isti
- ZenMode UI — nema promjena

## Scope
- 1 fajl, ~200 linija zamijenjeno (5 funkcija)
- Nema novih zavisnosti
- Backward-compatible — isti tipovi, isti API

