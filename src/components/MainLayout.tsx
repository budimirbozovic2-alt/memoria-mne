import { ReactNode, useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import PomodoroTimer from "@/components/PomodoroTimer";
import DocxImporter from "@/components/DocxImporter";
import ExportImportDialog from "@/components/ExportImportDialog";
import ZenMode from "@/components/ZenMode";
import GlobalSearch from "@/components/GlobalSearch";
import AppSidebar from "@/components/AppSidebar";
import { Search, Focus, Download, FileText, Home, GraduationCap, RotateCcw, MoreHorizontal } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MOBILE_PRIMARY = [
  { path: "/", icon: Home, label: "Početna" },
  { path: "/learn", icon: GraduationCap, label: "Uči" },
  { path: "/review", icon: RotateCcw, label: "Ponavljaj" },
];

export default function MainLayout({ children }: { children: ReactNode }) {
  const ctx = useAppContext();
  const { setView, setEditingCard, stats, cards, categories, exportData, exportTemplate, importData, importCards, addFlashCard } = ctx;
  const { pathname } = useLocation();

  const [docxOpen, setDocxOpen] = useState(false);
  const [exportImportOpen, setExportImportOpen] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

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

  const isReviewOrLearn = pathname === "/review" || pathname === "/learn";

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Compact header */}
          <header className="border-b h-12 px-4 flex items-center justify-between bg-background/80 backdrop-blur-sm sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="hidden md:flex" />
              <span className="md:hidden text-base font-serif italic text-primary">Memoria</span>
            </div>

            <div className="flex items-center gap-1.5">
              <PomodoroTimer compact />
              <div className="w-px h-4 bg-border mx-0.5" />
              {isReviewOrLearn && (
                <button onClick={() => setZenMode(!zenMode)} className={`p-1.5 rounded-lg hover:bg-secondary transition-colors ${zenMode ? "text-primary bg-primary/10" : "text-muted-foreground"}`} title="Zen Mode">
                  <Focus className="h-4 w-4" />
                </button>
              )}
              <button onClick={() => setGlobalSearchOpen(true)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground" title="Pretraži (Ctrl+K)">
                <Search className="h-4 w-4" />
              </button>
              <button onClick={() => setDocxOpen(true)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground" title="Uvezi DOCX">
                <FileText className="h-4 w-4" />
              </button>
              <button onClick={() => setExportImportOpen(true)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground" title="Export / Import">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 px-4 md:px-8 py-6 max-w-5xl mx-auto w-full">
            {children}
          </main>

          {/* Mobile bottom nav — 3 primary + More */}
          <nav className="md:hidden border-t flex justify-around py-2.5 bg-background/95 backdrop-blur-sm sticky bottom-0 z-30">
            {MOBILE_PRIMARY.map(({ path, icon: Icon, label }) => {
              const isActive = pathname === path;
              const badge = path === "/review" && stats.due > 0 ? stats.due : undefined;
              return (
                <button
                  key={path}
                  onClick={() => setView(path === "/" ? "dashboard" : path.slice(1) as any)}
                  className={`relative flex flex-col items-center gap-0.5 text-[11px] transition-colors px-3 py-1 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                  {badge !== undefined && (
                    <span className="absolute -top-0.5 right-0 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex flex-col items-center gap-0.5 text-[11px] text-muted-foreground px-3 py-1">
                  <MoreHorizontal className="h-5 w-5" />
                  Više
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-48 mb-2">
                <DropdownMenuItem onClick={() => setView("mnemonic")}>Memo radionica</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView("cards")}>Kartice</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView("categories")}>Kategorije</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView("stats")}>Statistike</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView("planner")}>Planer</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView("knowledge-map")}>Mapa znanja</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView("settings")}>Podešavanja</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>

      <DocxImporter
        open={docxOpen}
        onClose={() => setDocxOpen(false)}
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
          setDocxOpen(false);
        }}
      />
      <ExportImportDialog
        open={exportImportOpen}
        onOpenChange={setExportImportOpen}
        onExportTemplate={exportTemplate}
        onExportFull={exportData}
        onImport={importData}
        cards={cards}
      />
      <AnimatePresence>
        <ZenMode active={zenMode} onToggle={() => setZenMode(false)} />
      </AnimatePresence>
      <GlobalSearch
        cards={cards}
        open={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
        onNavigateToCard={(card) => {
          setEditingCard(card);
          setView("edit");
        }}
      />
    </SidebarProvider>
  );
}
