

# Fix: Uklanjanje kursora za uređivanje na svim neaktivnim tekstovima

## Problem
Trenutno CSS pravilo pokriva samo `.prose` i `[contenteditable="false"]` elemente. Obični tekst (`<p>`, `<span>`, `<h1>` itd.) koji nema te klase/atribute i dalje prikazuje `cursor: text` (I-beam kursor) kad se klikne, što izgleda kao da se tekst može urediti.

## Rješenje
Proširiti CSS u `src/index.css`:

```css
/* ─── Hide caret on non-editable elements ────── */
[contenteditable="false"],
.prose:not([contenteditable="true"]) {
  caret-color: transparent;
  user-select: none;
}

/* Prevent text cursor on non-interactive elements */
h1, h2, h3, h4, h5, h6, p, span, label, div {
  cursor: default;
}

/* Restore text cursor where editing/selection is expected */
input, textarea, [contenteditable="true"], .prose[contenteditable="true"],
[role="textbox"], .select-text {
  cursor: text;
}

a, button, [role="button"], summary, [tabindex] {
  cursor: pointer;
}
```

## Scope
- 1 fajl (`src/index.css`), ~12 linija izmjena
- Bez rizika za editabilne elemente jer su eksplicitno izuzeti

