## Cilj

Primijeniti isti "featured" vizualni tretman koji već koristi **Konsolidacija znanja** kartica (gradient pozadina, debeli primary border, sjenka, "Preporučeno" badge sa Sparkles ikonom, krupnija ikona u solid primary kvadratu, hover lift) na još dvije akcije:

1. **Učenje uz aktivno prisjećanje** — `coreActions[0]` u `src/views/SubjectDashboard.tsx`
2. **Pasivno čitanje** — `TabsTrigger value="read"` u `src/views/SubjectCardsView.tsx`

Cilj je da sve tri ključne akcije za učenje izgledaju jednako istaknuto i prepoznatljivo.

## Izmjene

### 1. `src/views/SubjectDashboard.tsx`

Trivijalno: u `coreActions` memo-u (linija 117–134) postaviti `featured: true` na "Aktivno prisjećanje".

```diff
   {
     onClick: () => setMatrixOpen(true),
     icon: Brain,
     title: "Učenje uz aktivno prisjećanje",
     desc: "Matrični filter — testiranje i učvršćivanje znanja",
-    featured: false,
+    featured: true,
     badge: null as number | null,
   },
```

Postojeća render logika (linije 287–331) već crta featured stil kad je `featured: true`. Pošto `badge === null`, neće se prikazati brojač ni `animate-pulse` na ikoni — samo "Preporučeno" pill, gradient, border-2, krupna solid ikona i hover lift. Opis ostaje statičan jer `hasDue === false`.

**Posljedica vizualnog balansa:** obje kartice u toj 2-kolonskoj sekciji "Alati za učenje" sad su featured. To je željeno — obje su primarne radnje učenja, dok su "Baza i Izvori znanja" (3-kolonska sekcija iznad) namjerno neutralne.

### 2. `src/views/SubjectCardsView.tsx`

Trenutni "Pasivno čitanje" je samo `TabsTrigger` u 1-itemskoj `TabsList` (linije 178–189). Da bismo dobili identičan featured look kao na dashboardu, ali zadržali integraciju sa `Tabs` (jer klik mora prebaciti `value` na `"read"`), refaktorišemo grupu "Učenje":

- Zadržavamo `TabsTrigger` kao bazu (Radix UI hendla aria-selected/keyboard nav).
- Override-ujemo izgled kroz `className`-ove tako da imitiramo featured kartice iz dashboarda: `relative rounded-xl p-5 border-2 border-primary/50 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 hover:border-primary hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-0.5 transition-all w-full justify-start text-left h-auto`.
- Dodajemo apsolutno pozicionirani **"Preporučeno"** pill sa `Sparkles` ikonom (gornji desni ugao).
- Solid primary kvadrat sa krupnom (`h-6 w-6`) `BookOpen` ikonom lijevo + naslov (`font-bold text-base`) i kratak opis (`text-xs text-muted-foreground`) desno.
- Aktivno stanje (kad je tab izabran) dodatno pojačavamo `data-[state=active]:border-primary data-[state=active]:shadow-xl data-[state=active]:shadow-primary/20` — Radix već postavlja `data-state="active"` na trigger.

**`TabsList` izmjene:** uklanjamo `border bg-card p-1 overflow-x-auto flex-nowrap` jer featured kartica nosi vlastiti chrome; ostavljamo `w-full` da popuni red.

**Importi:** dodati `Sparkles` u `lucide-react` import (red 4–5).

**Šta NE diramo:**
- Tab "Uređivanje i raspored kartica" (manage) — ostaje obični kompaktan trigger; dvije akcije imaju različitu vizualnu težinu i to je u redu jer je manage tehnički/uređivački, a pasivno čitanje promovirana metoda učenja.
- Internu logiku, snapshot, `value="read"`, `onValueChange` — sve nepromijenjeno.
- `MANAGE_MODES` registry iz prethodnog koraka.

### Skica novog "Pasivno čitanje" trigera

```text
┌──────────────────────────────────────────── Preporučeno ✦ ┐
│ ┌─────┐                                                    │
│ │ 📖  │  Pasivno čitanje                                    │
│ │     │  Slušanje i čitanje sadržaja kartica bez ocjenjivanja│
│ └─────┘                                                    │
└────────────────────────────────────────────────────────────┘
```

## Provjera

- Build mora ostati zelen (samo dodavanje `Sparkles` importa + className izmjene).
- Klik i tipkovnička navigacija na "Pasivno čitanje" tab i dalje rade (Radix `TabsTrigger` semantika netaknuta).
- Snapshot/restore ponašanje (`useEditReturn`) nije pogođeno.

## Fajlovi

- `src/views/SubjectDashboard.tsx` — jedna linija (`featured: true` za prvu akciju).
- `src/views/SubjectCardsView.tsx` — restil `TabsTrigger value="read"` + dodavanje `Sparkles` u import; cca 15 linija JSX-a.