

## Plan: Intent-Based SubjectDashboard Redesign (horizontalni layout)

### Layout struktura

```text
┌─────────────────────────────────────────────────┐
│  ← Back   Subject Name          [📊] [ℹ] [⚙]  │
├─────────────────────────────────────────────────┤
│  Prikaz Znanja (progress barovi po glavama)     │
├─────────────────────────────────────────────────┤
│  BAZA I IZVORI ZNANJA                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │Zettelkast│  │ Izvori   │  │ Kartice  │      │
│  │en        │  │          │  │          │      │
│  └──────────┘  └──────────┘  └──────────┘      │
├─────────────────────────────────────────────────┤
│  ALATI ZA UČENJE                                │
│  ┌─────────────────────┐ ┌────────────────────┐ │
│  │ 🧠 Učenje uz aktivno│ │ 🔄 Konsolidacija   │ │
│  │    prisjećanje       │ │    znanja          │ │
│  └─────────────────────┘ └────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Izmjene u `src/views/SubjectDashboard.tsx`

**Header** — bez promjena u odnosu na prethodni plan: back dugme + naziv predmeta lijevo, 3 icon buttona desno (BarChart3, Info, Settings) sa Tooltip-om.

**Prikaz Znanja** — bez promjena, full-width sekcija sa progress barovima.

**Baza i Izvori znanja** — full-width sekcija sa `grid-cols-3` rasporedom:
1. "Zettelkasten" (icon: `Network`, desc: "Baza znanja i mentalne mape", link: `#`)
2. "Izvori" (icon: `BookOpen`, desc: "Zakoni, skripte i fokusirano čitanje", link: `/category/${categoryId}`)
3. "Kartice" (icon: `Layers`, desc: "Upravljanje karticama, struktura i mnemonika", link: `#`)
- Sekundarni vizuelni stil (glass-card, neutralni akcenti)

**Alati za učenje** — full-width sekcija sa `grid-cols-2` rasporedom na dnu:
1. "Učenje uz aktivno prisjećanje" (icon: `Brain`, link: `/learn?cat=${categoryId}`)
2. "Konsolidacija znanja" (icon: `RefreshCw`, link: `/review?cat=${categoryId}`)
- Primarni vizuelni stil (veće kartice, primary accent boje)

### Uklanjanja

- Stara 5-kartica "Integrisani Workflow" sekcija i `workflowCards` memo
- "Kontekstualni Alati" sekcija i `contextTools` memo
- Nekorišteni importi (`Compass`, `Globe`, `Zap`, `GitBranch`, `Sparkles`)

### Fajlovi

| Fajl | Akcija |
|------|--------|
| `src/views/SubjectDashboard.tsx` | Potpuni rewrite — novi layout, ~180 linija |

**1 fajl. Nema novih fajlova. Nema promjena ruta.**

