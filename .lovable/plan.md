

# Fix: Sidebar ne prati scroll

## Problem
`<aside>` (Sidebar) nema `sticky top-0 h-screen`. Kada sadržaj stranice prelazi visinu viewporta, cijela stranica skroluje zajedno sa sidebarom — sidebar nestaje prema gore.

## Rješenje
Dodati `sticky top-0 h-screen` na `<aside>` element u `src/components/ui/sidebar.tsx`. Ovo osigurava da sidebar ostane fiksiran uz vrh ekrana dok se glavni sadržaj skroluje, a `SidebarContent` (koji već ima `overflow-y-auto`) upravlja internim skrolovanjem ako sidebar ima previše stavki.

## Izmjena

**Fajl: `src/components/ui/sidebar.tsx`** — u `Sidebar` komponenti, dodati klase `sticky top-0 h-screen` na `<aside>`:

```tsx
// Prije:
"group/sidebar flex flex-col border-r bg-sidebar ... shrink-0"

// Poslije:
"group/sidebar sticky top-0 h-screen flex flex-col border-r bg-sidebar ... shrink-0"
```

## Scope
- 1 fajl, 1 linija izmjene
- Bez funkcionalnih promjena osim fiksiranog pozicioniranja sidebara

