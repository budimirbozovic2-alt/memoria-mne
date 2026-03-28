
Problem nije samo u “renderovanju” sidebar-a, nego u tome što su sada dva različita izvora istine za kategorije:

1. `useCardBootstrap` i `useCards` učitavaju kategorije tokom boot-a, ali u context čuvaju samo `string[]` nazive.
2. `AppSidebar.tsx` ne koristi taj boot-load tok, nego radi direktan `useLiveQuery` nad `db.categories`.

To je arhitektonski konflikt sa postojećim “boot-load-all” obrascem. Posljedica je da sidebar zavisi od zasebnog Dexie reaktivnog toka koji može ostati prazan ili zakasniti, i zato vidiš naslov “PREDMETI” bez stavki.

Šta sam provjerio:
- `AppSidebar.tsx` već mapira kategorije ispravno i koristi UUID route (`/category/${cat.id}`).
- `seedDefaultCategories()` postoji i poziva se i u boot-u i u sidebar-u.
- `MainLayout` uvijek renderuje sidebar.
- Screenshot pokazuje da se aplikacija učitala, ali lista i dalje nije pouzdana.
- Memory kontekst kaže da je odluka sistema da se izbjegava `useLiveQuery` kao glavni data flow; ovdje je sidebar upravo izuzetak i to je vjerovatni uzrok buga.

Predloženo rješenje:
1. Uskladiti sidebar sa glavnom arhitekturom:
   - ukloniti oslanjanje `AppSidebar.tsx` na `useLiveQuery` kao primarni izvor
   - proširiti boot/context da čuva pune `CategoryRecord[]` (id, name, color, sortOrder), ne samo `string[]`
2. `useCardBootstrap` treba nakon `seedDefaultCategories()` predati kompletne category recorde u stanje/context.
3. `AppContext/useCards` treba izlagati te recorde za UI potrošače sidebar-a i breadcrumb-a.
4. `AppSidebar.tsx` treba renderovati kategorije iz context-a, ne direktno iz Dexie upita.
5. Kao defanzivni fallback, ostaviti seed guard samo na boot nivou, a ne u sidebar komponenti.
6. Po potrebi prilagoditi `Breadcrumbs` da koristi isti category source ili da ostane direktni lookup samo za labelu detalja rute.

Zašto je ovo pravo rješenje:
- uklanja race condition između boot-a i sidebar-a
- vraća aplikaciju na jedan izvor istine
- poštuje novu category-centric arhitekturu
- čini prikaz kategorija determinističkim nakon refresh-a

Konkretne izmjene:
- `src/hooks/useCardBootstrap.ts`
  - dodati setter za pune category recorde
  - boot treba spremiti kompletan rezultat `seedDefaultCategories()`
- `src/hooks/useCards.ts`
  - držati `categoryRecords` u state-u uz postojeći `categories`
  - eventualno iz `categoryRecords` izvoditi `categories: string[]` radi backward compatibility
- `src/contexts/AppContext.tsx`
  - izložiti `categoryRecords` kroz card data context
- `src/components/AppSidebar.tsx`
  - render iz `categoryRecords`
  - ukloniti direktni `useLiveQuery` dependency kao glavni tok
- opcionalno `src/components/Breadcrumbs.tsx`
  - koristiti isti shared source za naziv kategorije kad je dostupan

Napomena:
Trenutni “quick fix” sa `seedDefaultCategories()` u `AppSidebar.tsx` je dobar kao privremeni flaster, ali ne rješava osnovni problem razdvojenih tokova podataka. Za stabilnost Phase 2/3 arhitekture, sidebar treba prebaciti na context-driven kategorije.

Implementacioni cilj:
Nakon ove izmjene, kategorije će se pojaviti pouzdano poslije refresh-a jer će sidebar koristiti iste podatke koje boot već učitava i garantuje.

Tehnički detalji:
```text
Trenutno:
Boot -> učita CategoryRecord[] -> pretvori u string[] -> Context
Sidebar -> zasebno pita Dexie -> [] ili kasni -> ništa ne renderuje

Poslije ispravke:
Boot -> učita CategoryRecord[] -> Context
Sidebar -> čita CategoryRecord[] iz Context-a -> renderuje UUID linkove
```
