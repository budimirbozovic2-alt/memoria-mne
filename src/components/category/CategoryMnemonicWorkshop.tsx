import { useState, useMemo, useCallback } from "react";
import { Brain, Wrench, Search, Sparkles, CheckCircle2, ArrowUpDown } from "lucide-react";
import { MnemonicCard, MnemonicStatus, loadMnemonicCards, saveMnemonicCards, loadMajorSystem } from "@/lib/mnemonic-storage";
import WorkshopCardItem from "@/components/workshop/WorkshopCardItem";
import { useDebounce } from "@/hooks/useDebounce";
import type { Card } from "@/lib/spaced-repetition";

const STATUS_FILTERS: { value: MnemonicStatus | "all"; label: string; icon: typeof Sparkles }[] = [
  { value: "all", label: "Sve", icon: Brain },
  { value: "new", label: "Nove", icon: Sparkles },
  { value: "in-workshop", label: "U radionici", icon: Wrench },
  { value: "ready", label: "Spremne", icon: CheckCircle2 },
];

interface Props {
  categoryId: string;
  categoryName: string;
  categoryCards: Card[];
}

export default function CategoryMnemonicWorkshop({ categoryId, categoryName, categoryCards }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<MnemonicStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "status" | "success">("newest");
  const [, setRefresh] = useState(0);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const majorSystem = useMemo(() => loadMajorSystem(), []);

  // Card IDs in this category — used to scope mnemonic cards
  const categoryCardIds = useMemo(
    () => new Set(categoryCards.map(c => c.id)),
    [categoryCards]
  );

  // Load and filter mnemonic cards scoped to this category
  const allMnemonicCards = useMemo(() => {
    const all = loadMnemonicCards();
    return all.filter(mc => categoryCardIds.has(mc.originalCardId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryCardIds, /* trigger re-read after mutations */]);

  const filtered = useMemo(() => {
    let result = allMnemonicCards;
    if (filterStatus !== "all") result = result.filter(c => c.mnemonicStatus === filterStatus);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(c =>
        c.question.toLowerCase().includes(q) ||
        c.mnemonicVideo.toLowerCase().includes(q) ||
        c.acronym.toLowerCase().includes(q) ||
        c.sections.some(s => s.content.toLowerCase().includes(q))
      );
    }
    const statusOrder: Record<MnemonicStatus, number> = { "new": 0, "in-workshop": 1, "ready": 2 };
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "status": return statusOrder[a.mnemonicStatus] - statusOrder[b.mnemonicStatus];
        case "success": {
          const aRate = a.testCount > 0 ? a.successCount / a.testCount : -1;
          const bRate = b.testCount > 0 ? b.successCount / b.testCount : -1;
          return aRate - bRate;
        }
        default: return b.createdAt - a.createdAt;
      }
    });
  }, [allMnemonicCards, filterStatus, debouncedSearch, sortBy]);

  const statusCounts = useMemo(() => ({
    all: allMnemonicCards.length,
    new: allMnemonicCards.filter(c => c.mnemonicStatus === "new").length,
    "in-workshop": allMnemonicCards.filter(c => c.mnemonicStatus === "in-workshop").length,
    ready: allMnemonicCards.filter(c => c.mnemonicStatus === "ready").length,
  }), [allMnemonicCards]);

  const handleUpdate = useCallback((id: string, updates: Partial<MnemonicCard>) => {
    const all = loadMnemonicCards();
    const updated = all.map(c => c.id === id ? { ...c, ...updates } : c);
    saveMnemonicCards(updated);
    setRefresh(r => r + 1);
  }, []);

  const handleDelete = useCallback((id: string) => {
    const all = loadMnemonicCards();
    saveMnemonicCards(all.filter(c => c.id !== id));
    setRefresh(r => r + 1);
  }, []);

  const handleToggle = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          Radionica mentalnih kuka
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Mnemonike za kartice u kategoriji: <strong className="text-foreground">{categoryName}</strong>
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-lg border bg-card p-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Pretraži mnemo kartice..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Status chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(sf => {
            const Icon = sf.icon;
            return (
              <button
                key={sf.value}
                onClick={() => setFilterStatus(sf.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  filterStatus === sf.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="h-3 w-3" />
                {sf.label}
                <span className={`text-[10px] px-1 py-0.5 rounded-full ${
                  filterStatus === sf.value ? "bg-primary-foreground/20" : "bg-secondary"
                }`}>
                  {statusCounts[sf.value]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Brain className="h-12 w-12 mx-auto mb-4 opacity-30" />
          {allMnemonicCards.length === 0 ? (
            <>
              <p className="text-sm">Nema mnemo kartica u ovoj kategoriji.</p>
              <p className="text-xs mt-1">Selektuj tekst u sesiji učenja i klikni „Mnemo kuka" da dodaš karticu.</p>
            </>
          ) : debouncedSearch ? (
            <p className="text-sm">Nema rezultata za „{debouncedSearch}"</p>
          ) : (
            <p className="text-sm">Nema kartica sa ovim statusom.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{filtered.length} kartica</p>
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
              {(["newest", "status", "success"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                    sortBy === s ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {s === "newest" ? "Najnovije" : s === "status" ? "Status" : "Uspješnost"}
                </button>
              ))}
            </div>
          </div>
          {filtered.map(card => (
            <WorkshopCardItem
              key={card.id}
              card={card}
              isExpanded={expandedId === card.id}
              onToggle={() => handleToggle(card.id)}
              onUpdateCard={handleUpdate}
              onDeleteCard={handleDelete}
              majorSystem={majorSystem}
            />
          ))}
        </div>
      )}
    </div>
  );
}
