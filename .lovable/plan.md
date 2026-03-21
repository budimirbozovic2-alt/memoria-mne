

## Označavanje teksta za Mnemo radionicu

### Šta se mijenja
Umjesto označavanja cijele kartice ikonom mozga, korisnik će moći da **selektuje dio teksta** unutar sekcije kartice (tokom učenja ili u bazi) i jednim klikom ga pošalje u Mnemo radionicu. Samo selektovani tekst se klonira kao nova mnemotehnička kartica.

### Kako će to izgledati
1. Korisnik označi (selektuje) dio teksta mišem u sekciji kartice
2. Pojavi se mali **floating tooltip** iznad selekcije sa ikonom mozga i tekstom "Mnemo kuka"
3. Klik na tooltip kreira mnemotehničku karticu sa selektovanim tekstom kao jedinom sekcijom
4. Toast potvrda: "Dodano u Mnemo radionicu"

### Tehnički plan

**1. `src/lib/mnemonic-storage.ts`** — nova helper funkcija:
- `createMnemonicCardFromSelection(cardId, question, selectedText, category, subcategory, tags)` — kreira MnemonicCard gdje je `sections` samo `[{ title: "Isječak", content: selectedText }]`

**2. `src/components/TextSelectionTooltip.tsx`** — novi komponent:
- Sluša `mouseup` event na parent kontejneru
- Provjerava `window.getSelection()` — ako ima selektovani tekst (>5 karaktera), prikazuje apsolutno pozicionirani tooltip na poziciji selekcije
- Tooltip sadrži dugme sa Brain ikonom
- Klik poziva callback `onAddToMnemonic(selectedText: string)`
- Tooltip se sklanja na `mousedown` ili kad selekcija nestane

**3. `src/components/LearnSession.tsx`** — integracija:
- Wrap sekcija sadržaja u kontejner koji koristi `TextSelectionTooltip`
- Callback `onAddToMnemonic` kreira mnemo karticu iz selekcije koristeći podatke trenutne kartice (question, category, itd.)
- Radi u svim režimima (slobodno, aktivno, lanac)

**4. `src/components/CardList.tsx`** — integracija u bazu podataka:
- Isti tooltip na expandiranom sadržaju kartice (ako postoji prikaz sekcija)
- Alternativno: dodati u detail/preview prikaz kartice

**5. `src/contexts/AppContext.tsx`** — nova funkcija:
- `addToMnemonicWorkshop(cardId, question, selectedHtml, category, subcategory, tags)` — dostupna globalno
- Ukloniti stari `handleSendToWorkshop` ako više nije potreban

**6. Uklanjanje starog pristupa:**
- Ukloniti Brain ikonu iz `CardList.tsx` tag dugmadi
- Ukloniti `memorizacija` tag iz `CARD_TAGS` u `spaced-repetition.ts`
- Očistiti `handleToggleTag` logiku za memorizacija u `AppContext.tsx`
- Ažurirati InfoPanel tekstove u `MnemonicModule.tsx` i `MnemonicWorkshop.tsx`

