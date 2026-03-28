
Analiza 4 tačke:

1. Provider Trap
- Ne, `AppSidebar` nije izvan provider-a.
- U `src/App.tsx` redoslijed je: `HashRouter > AppProvider > ... > MainLayout`.
- U `src/components/MainLayout.tsx`, `AppSidebar` se renderuje unutar `MainLayout`.
- `AppProvider` iz `src/contexts/AppContext.tsx` obavija cijelo stablo prije `MainLayout`, tako da `useCardData()` u sidebar-u ima pristup kontekstu.

2. Silent Bailout
- U `AppSidebar.tsx` nema `if (isLoading) return null`, niti bilo kakvog ranog `return null`.
- `MainLayout.tsx` takođe ne uslovljava render `AppSidebar`.
- Jedini bailout u provider lancu je `if (h.dbError)` u `CardProvider`, ali tada bi se prikazao recovery panel umjesto cijele aplikacije. Pošto vidiš normalan layout i header, to nije aktivni problem.

3. Map Syntax Error
- `displayCategories.map((cat) => { ... return (...) })` je sintaksno ispravan.
- `key={cat.id}` postoji.
- Route koristi ispravan UUID: ``/category/${cat.id}``.
- Dakle, problem nije “missing return” niti `key`.

4. CSS Trap
- Ovo je najvjerovatniji uzrok vidljivog simptoma.
- `Sidebar` u kolapsiranom stanju ima širinu `3rem`.
- `SidebarGroupLabel` postaje `opacity-0`, ali grupa ostaje prisutna.
- Stavke se i dalje renderuju, ali:
  - tekst se ne prikazuje kada je `collapsed`
  - kod kategorija se prikazuje samo mala tačka boje (`h-2.5 w-2.5`)
  - zbog `justify-center px-0` na `SidebarMenuButton` i `overflow-hidden` na `Sidebar`, te tačkice izgledaju kao da “nema ničega”
- Drugim riječima: kategorije su vrlo vjerovatno renderovane, ali vizuelno gotovo neprimjetne kada je sidebar ostao zapamćen u collapsed modu.

Tačan fix:
- Forsirati da sidebar starta otvoren kako bi “Predmeti” lista bila odmah vidljiva.
- Ukloniti nepotreban `useLocation` iz `AppSidebar.tsx`.
- Dodati jači vizuelni fallback za kategorije u collapsed modu tako da se ne svode na skoro nevidljivu tačku.

Kod za izmjenu:

1. `src/components/MainLayout.tsx`
```tsx
import { ReactNode, useState, useEffect, useRef, lazy, Suspense, memo, useCallback } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useLocation } from "react-router-dom";
import { useUIContext, useCardContext } from "@/contexts/AppContext";
import ZenMode from "@/components/ZenMode";
import AppSidebar from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AnimatePresence } from "framer-motion";
import { hasSeenOnboarding } from "@/components/OnboardingModal";
import { APP_ONBOARDING_KEY } from "@/components/AppOnboarding";
import { toast } from "@/hooks/use-toast";
import { type PlannerConfig, loadPlanner, getSmartSuggestion, calcVelocity, getDailyMappedCount } from "@/lib/planner-storage";
import { Moon, Sun, Search, Focus, HelpCircle } from "lucide-react";
import { setDarkMode } from "@/lib/app-settings";

const DocxImporter = lazy(() => import("@/components/DocxImporter"));
const GlobalSearch = lazy(() => import("@/components/GlobalSearch"));
const AppOnboarding = lazy(() => import("@/components/AppOnboarding"));

const SOURCE_ROUTES = ["/cards", "/categories", "/sources", "/database", "/category/"];

/** Isolated component for planner nudge */
const NudgeWatcher = memo(function NudgeWatcher() {
  const { cards } = useCardContext();
  const { pathname } = useLocation();
  const prevPathRef = useRef(pathname);
  const nudgeShownRef = useRef(false);
  const plannerRef = useRef<PlannerConfig | null>(null);

  const getPlannerCached = () => {
    if (!plannerRef.current) plannerRef.current = loadPlanner();
    return plannerRef.current;
  };

  useEffect(() => {
    if (pathname === "/planner") plannerRef.current = null;
  }, [pathname]);

  useEffect(() => {
    const prevPath = prevPathRef.current;
    prevPathRef.current = pathname;
    if (!SOURCE_ROUTES.some(r => prevPath.startsWith(r))) return;
    if (SOURCE_ROUTES.some(r => pathname.startsWith(r))) return;
    if (nudgeShownRef.current) return;

    try {
      const planner = getPlannerCached();
      if (!planner.finalGoalDate || planner.phases.length === 0) return;
      const velocity = calcVelocity([], 7);
      const suggestion = getSmartSuggestion(null, cards, planner.finalGoalDate, velocity, planner.bufferPercent ?? 15);
      if (!suggestion || suggestion.suggestedToday <= 0) return;
      const dailyDone = getDailyMappedCount();
      const remaining = suggestion.suggestedToday - dailyDone;
      if (remaining > 0 && dailyDone < suggestion.suggestedToday) {
        nudgeShownRef.current = true;
        toast({
          title: "📌 Ostani fokusiran",
          description: `Preostalo ti je još ${remaining} od ${suggestion.suggestedToday} planiranih sekcija za danas.`,
          duration: 5000,
        });
        setTimeout(() => { nudgeShownRef.current = false; }, 30 * 60 * 1000);
      }
    } catch {}
  }, [pathname, cards]);

  return null;
});

/** Isolated wrapper for GlobalSearch */
const GlobalSearchWrapper = memo(function GlobalSearchWrapper({
  open, onClose,
}: { open: boolean; onClose: () => void }) {
  const { cards } = useCardContext();
  const { setView, setEditingCard } = useUIContext();
  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <GlobalSearch
        cards={cards}
        open={open}
        onClose={onClose}
        onNavigateToCard={(card) => {
          setEditingCard(card);
          setView("edit");
        }}
      />
    </Suspense>
  );
});

/** Isolated wrapper for DocxImporter */
const DocxImporterWrapper = memo(function DocxImporterWrapper({
  open, onClose,
}: { open: boolean; onClose: () => void }) {
  const { categories, importCards, addFlashCard } = useCardContext();
  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <DocxImporter
        open={open}
        onClose={onClose}
        categories={categories}
        onImport={(docxCards, cat, cardType) => {
          if (cardType === "flash") {
            docxCards.forEach(c => {
              const answer = c.sections.map(s => s.content).join("\n");
              addFlashCard(c.question, answer, cat);
            });
          } else {
            importCards(docxCards, cat);
          }
          onClose();
        }}
      />
    </Suspense>
  );
});

export default function MainLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  const [docxOpen, setDocxOpen] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [showAppOnboarding, setShowAppOnboarding] = useState(
    () => !hasSeenOnboarding(APP_ONBOARDING_KEY)
  );
  const [dark, setDarkState] = useState(() => document.documentElement.classList.contains("dark"));

  const toggleDark = useCallback(() => {
    const next = !dark;
    setDarkState(next);
    setDarkMode(next);
  }, [dark]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setGlobalSearchOpen(v => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const isFullWidth = SOURCE_ROUTES.some(r => pathname.startsWith(r));

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-0 flex-1 w-full">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 flex items-center h-11 px-4 border-b bg-background/90 backdrop-blur-md gap-2">
            <SidebarTrigger className="shrink-0" />
            <Breadcrumbs />
            <div className="flex-1" />
            <button
              onClick={() => setGlobalSearchOpen(true)}
              className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground"
              title="Pretraži (Ctrl+K)"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowAppOnboarding(true)}
              className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground"
              title="Vodič"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <button
              onClick={() => setZenMode(v => !v)}
              className={`p-1.5 rounded-md hover:bg-secondary transition-colors ${zenMode ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
              title="Zen Mode"
            >
              <Focus className="h-4 w-4" />
            </button>
            <button
              onClick={toggleDark}
              className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground"
              title="Tema"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </header>

          <NudgeWatcher />

          <main className={`flex-1 px-4 md:px-8 py-6 w-full ${
            isFullWidth ? "max-w-none" : "max-w-6xl mx-auto"
          }`}>
            {children}
          </main>
        </div>
      </div>

      <DocxImporterWrapper open={docxOpen} onClose={() => setDocxOpen(false)} />
      <AnimatePresence>
        <ZenMode active={zenMode} onToggle={() => setZenMode(false)} />
      </AnimatePresence>
      <GlobalSearchWrapper open={globalSearchOpen} onClose={() => setGlobalSearchOpen(false)} />
      <AnimatePresence>
        {showAppOnboarding && (
          <Suspense fallback={null}>
            <AppOnboarding onComplete={() => setShowAppOnboarding(false)} />
          </Suspense>
        )}
      </AnimatePresence>
    </SidebarProvider>
  );
}
```

2. `src/components/AppSidebar.tsx`
```tsx
import { useEffect, useState } from "react";
import { NavLink } from "@/components/NavLink";
import {
  Home, Landmark, Settings as SettingsIcon, RotateCcw,
  BarChart3, BookOpen, Gauge, Zap, Map, Scale, GraduationCap,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useCardData } from "@/contexts/AppContext";
import type { CategoryRecord } from "@/lib/db";

const STATIC_NAV = [
  { path: "/", icon: Home, label: "Dashboard" },
  { path: "/learn", icon: GraduationCap, label: "Učenje" },
  { path: "/review", icon: RotateCcw, label: "Konsolidacija", badge: true },
  { path: "/forum", icon: Landmark, label: "Forum" },
];

const TOOLS_NAV = [
  { path: "/stats", icon: BarChart3, label: "Statistika" },
  { path: "/metacognitive", icon: BookOpen, label: "Dnevnik" },
  { path: "/planner", icon: Gauge, label: "Strateški planer" },
  { path: "/speed-reader", icon: Zap, label: "Speed Reader" },
  { path: "/mind-map", icon: Map, label: "Mentalne mape" },
];

export default function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { stats, categoryRecords } = useCardData();

  const [fallbackCategories, setFallbackCategories] = useState<CategoryRecord[]>([]);

  useEffect(() => {
    if (categoryRecords.length > 0) {
      if (fallbackCategories.length > 0) setFallbackCategories([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { seedDefaultCategories } = await import("@/lib/db");
        const cats = await seedDefaultCategories();
        setFallbackCategories(cats);
      } catch (e) {
        console.error("[sidebar] fallback failed", e);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [categoryRecords.length, fallbackCategories.length]);

  const displayCategories = categoryRecords.length > 0 ? categoryRecords : fallbackCategories;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigacija</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {STATIC_NAV.map(({ path, icon: Icon, label, badge }) => (
                <SidebarMenuItem key={path}>
                  <SidebarMenuButton asChild tooltip={label}>
                    <NavLink
                      to={path}
                      end={path === "/"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{label}</span>}
                      {!collapsed && badge && stats.due > 0 && (
                        <Badge variant="destructive" className="ml-auto text-[9px] h-4 min-w-[16px] px-1">
                          {stats.due}
                        </Badge>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Predmeti</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {displayCategories.length === 0 && (
                <SidebarMenuItem>
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    Učitavanje predmeta…
                  </div>
                </SidebarMenuItem>
              )}

              {displayCategories.map((cat) => (
                <SidebarMenuItem key={cat.id}>
                  <SidebarMenuButton asChild tooltip={cat.name}>
                    <NavLink
                      to={`/category/${cat.id}`}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      {collapsed ? (
                        <Scale className="h-4 w-4 shrink-0" />
                      ) : cat.color ? (
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                      ) : (
                        <Scale className="h-4 w-4 shrink-0" />
                      )}
                      {!collapsed && (
                        <span className="truncate text-[13px]">{cat.name}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Alati</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {TOOLS_NAV.map(({ path, icon: Icon, label }) => (
                <SidebarMenuItem key={path}>
                  <SidebarMenuButton asChild tooltip={label}>
                    <NavLink
                      to={path}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Podešavanja">
                  <NavLink
                    to="/settings"
                    className="hover:bg-sidebar-accent/50"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                  >
                    <SettingsIcon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">Podešavanja</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
```

Suština fixa:
- Nema provider problema.
- Nema bailout problema.
- Nema map problema.
- Aktivni UI problem je da je sidebar vrlo vjerovatno u persisted collapsed stanju, a kategorije se u tom modu svode na skoro nevidljive tačke. Ovaj fix ih čini vidljivim odmah i daje im jasan icon fallback u collapsed modu.
