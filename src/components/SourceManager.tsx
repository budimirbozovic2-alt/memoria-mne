import { useState, useEffect, useMemo } from "react";
import { Landmark, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCardContext } from "@/contexts/AppContext";
import { loadSources, type Source } from "@/lib/sources-storage";

/**
 * SourceManager — CODEX v2.0
 * Registry has been removed. This component now shows a simple
 * overview of sources grouped by categoryId.
 */
export default function SourceManager() {
  const { cards, categories } = useCardContext();
  const [sources, setSources] = useState<Source[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadSources().then(setSources);
  }, []);

  const sourceMap = useMemo(() => {
    const m = new Map<string, Source>();
    for (const s of sources) m.set(s.id, s);
    return m;
  }, [sources]);

  // Group sources by category
  const grouped = useMemo(() => {
    const groups = new Map<string, { sources: Source[]; cardCount: number }>();
    for (const cat of categories) {
      groups.set(cat, { sources: [], cardCount: 0 });
    }

    for (const source of sources) {
      const cat = source.categoryId || "Nekategorizovano";
      if (!groups.has(cat)) groups.set(cat, { sources: [], cardCount: 0 });
      groups.get(cat)!.sources.push(source);
    }

    // Count cards per category
    for (const card of cards) {
      if (!card.sourceId) continue;
      const src = sourceMap.get(card.sourceId);
      if (!src) continue;
      const cat = src.categoryId || "Nekategorizovano";
      if (groups.has(cat)) groups.get(cat)!.cardCount++;
    }

    return groups;
  }, [sources, cards, categories, sourceMap]);

  const filtered = useMemo(() => {
    if (!search) return grouped;
    const q = search.toLowerCase();
    const result = new Map<string, { sources: Source[]; cardCount: number }>();
    for (const [cat, data] of grouped) {
      const matchingSources = data.sources.filter(s => s.title.toLowerCase().includes(q));
      if (matchingSources.length > 0 || cat.toLowerCase().includes(q)) {
        result.set(cat, { sources: matchingSources.length > 0 ? matchingSources : data.sources, cardCount: data.cardCount });
      }
    }
    return result;
  }, [grouped, search]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4 rounded-xl text-center">
          <p className="text-2xl font-bold">{sources.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Izvora</p>
        </div>
        <div className="glass-card p-4 rounded-xl text-center">
          <p className="text-2xl font-bold">{cards.filter(c => c.sourceId).length}</p>
          <p className="text-xs text-muted-foreground mt-1">Povezanih kartica</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pretraži izvore..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-4">
        {Array.from(filtered.entries()).map(([cat, data]) => (
          data.sources.length > 0 && (
            <div key={cat} className="glass-card rounded-xl border overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <Landmark className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{cat}</p>
                  <p className="text-xs text-muted-foreground">
                    {data.sources.length} izvor{data.sources.length === 1 ? "" : "a"} • {data.cardCount} kartica
                  </p>
                </div>
              </div>
              <div className="px-4 pb-3 space-y-1">
                {data.sources.map(source => (
                  <div key={source.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-secondary/30 transition-colors">
                    <span className="text-sm flex-1 truncate">{source.title}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">v{source.version}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}