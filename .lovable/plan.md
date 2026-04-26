## Plan: Zettelkasten — Subject-Centric PKM

Nova "baza znanja" po predmetu — markdown članci sa Wiki-link-ovima `[[Naslov]]` i Guided Discovery ulazom kroz potkategorije.

### 1. Schema — `src/lib/db-schema.ts`

Novi tip i tabela:
```ts
export interface KnowledgeBaseArticle {
  id: string;
  subjectId: string;          // === categoryId
  title: string;              // unique per subject (case-insensitive za wiki-link match)
  content: string;            // markdown
  linkedSourceIds: string[];  // FK ka Source (zakoni/skripte) — opciono
  rootSubcategoryId?: string; // za Guided Discovery grupisanje
  createdAt: number;
  updatedAt: number;
}
```

Dexie v14:
```ts
this.version(14).stores({
  knowledgeBaseArticles: "id, subjectId, title, updatedAt, [subjectId+title]",
});
```

`MemoriaDB` klasa dobija `knowledgeBaseArticles!: Table<KnowledgeBaseArticle, string>;`. Postojeće verzije (7-13) ostaju netaknute → no-data-loss migracija.

### 2. Storage layer — `src/lib/zettelkasten-storage.ts` (NEW, ~60 linija)

```ts
loadArticlesBySubject(subjectId): Promise<KnowledgeBaseArticle[]>
getArticle(id): Promise<KnowledgeBaseArticle | undefined>
findArticleByTitle(subjectId, title): Promise<KnowledgeBaseArticle | undefined>
saveArticle(article): Promise<void>
deleteArticle(id): Promise<void>
```

Title lookup je case-insensitive (lowercase normalizacija) — koristi se za rezolvanje `[[wiki-links]]`.

### 3. View — `src/views/ZettelkastenView.tsx` (NEW, ~180 linija)

Tri stanja:

**a) Guided Discovery (default, no article open):**
- Header: "Koju oblast biste željeli više da istražite?"
- Grid root subcategorija (iz `categoryRec.subcategories`) — svaka tile pokazuje broj postojećih članaka u toj oblasti.
- Klik → filtrira listu članaka ispod (state `selectedSubId`).
- Sekcija "Svi članci" + dugme **"+ Novi članak"** za kreiranje (otvara editor sa praznim sadržajem; pri snimanju traži title).

**b) Article List (kad je odabrana oblast):**
- Sidebar lista filtriranih članaka po `rootSubcategoryId` (sa search input-om po title).
- Klik na članak → otvara editor.

**c) Editor view (article open):**
- Levo: `<ZettelEditor>` — markdown textarea sa toolbar dugmadima (Bold, Italic, H2, List, `[[Link]]`).
- Desno: `<ZettelPreview>` — renderovan markdown sa funkcionalnim wiki-link-ovima.
- Header: title (editable input), "Sačuvaj", "Obriši", "Nazad".

### 4. Markdown editor — `src/components/zettelkasten/ZettelEditor.tsx` (NEW, ~80 linija)

- Kontrolisani `<Textarea>` sa toolbar-om (shadcn `Button` ikone).
- Toolbar dugme "🔗 Link" umeće `[[]]` na poziciju kursora, kursor se postavlja između `[[ | ]]`.
- Auto-save na blur ili 1.5s debounce (preko `useDebounce`).
- Character count u footeru.

### 5. Markdown preview + wiki-links — `src/components/zettelkasten/ZettelPreview.tsx` (NEW, ~70 linija)

Lagani markdown renderer **bez nove dependencije** (već postoji `RichTextEditor` ali za HTML — ne koristimo). Custom mini-parser za:
- `**bold**`, `*italic*`, `` `code` ``
- `## H2`, `### H3`
- `- list items`, prazni redovi
- `[[Article Title]]` → klikabilan link

Wiki-link logika:
- Regex `\[\[([^\]]+)\]\]` zamijeni sa `<button>` koji poziva `onWikiLink(title)`.
- `ZettelkastenView` rješava: ako članak postoji → otvori; ako ne postoji → kreiraj novi sa tim title.

Sanitizacija kroz postojeći `sanitizeHtml` iz `src/lib/sanitize.ts` (defense-in-depth politika iz memorije).

### 6. Routing — `src/App.tsx`

```tsx
const ZettelkastenView = lazy(() => import("@/views/ZettelkastenView"));
// ...
<Route path="/subject/:categoryId/zettelkasten" element={
  <ErrorBoundary label="Zettelkasten">
    <Suspense fallback={<PageSkeleton />}><ZettelkastenView /></Suspense>
  </ErrorBoundary>
} />
```

### 7. SubjectDashboard wire-up — `src/views/SubjectDashboard.tsx`

Promijeniti `to: "#"` na Zettelkasten card-u (linija ~93) na `to: \`/subject/${categoryId}/zettelkasten\``. Jednolinijska promjena.

### 8. Tehnički detalji

| Fajl | Akcija | Linije |
|------|--------|--------|
| `src/lib/db-schema.ts` | + `KnowledgeBaseArticle` tip, + `knowledgeBaseArticles` tabela, Dexie v14 | ~15 |
| `src/lib/zettelkasten-storage.ts` | NEW — CRUD helpers | ~60 |
| `src/views/ZettelkastenView.tsx` | NEW — Guided Discovery + lista + editor switch | ~180 |
| `src/components/zettelkasten/ZettelEditor.tsx` | NEW — markdown textarea + toolbar | ~80 |
| `src/components/zettelkasten/ZettelPreview.tsx` | NEW — mini markdown renderer + wiki-links | ~70 |
| `src/App.tsx` | + lazy route `/subject/:categoryId/zettelkasten` | ~3 |
| `src/views/SubjectDashboard.tsx` | Wire Zettelkasten card link | ~1 |

**7 fajlova, ~410 linija. Bez novih npm dependencija** (custom mini-markdown parser). Backward-compatible (nove tabele, nove rute).
