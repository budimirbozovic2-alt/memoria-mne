import { memo, useMemo, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCardContext } from "@/contexts/AppContext";
import type { Monument } from "@/lib/forum-logic";
import { MATERIAL_ICONS } from "@/lib/forum-logic";
import { MonumentSVG } from "./monument-buildings";
import { ArchNode } from "./ArchNode";
import { useSourceHierarchy, type HierarchyNode } from "@/hooks/useSourceHierarchy";
import { getCardMasteryLevel } from "@/components/KnowledgeMap";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TabSkeleton } from "@/components/ui/page-skeleton";
import type { Source } from "@/lib/db";

const MentalSkeleton = lazy(() => import("@/components/MentalSkeleton"));

interface Props {
  monument: Monument;
  sources: Source[];
  onBack: () => void;
  onUpdateChapters?: (updates: { id: string; chapter: string; chapterOrder: number }[]) => void;
  onReviewSection?: (cardId: string, sectionId: string, grade: number) => void;
}

/** Compute average stability for a set of cards */
function computeAvgStability(cards: { sections: { stability: number }[] }[]): number {
  let total = 0;
  let count = 0;
  for (const card of cards) {
    for (const s of card.sections) {
      if (s.stability > 0) {
        total += s.stability;
        count++;
      }
    }
  }
  return count > 0 ? total / count : 0;
}

export const MonumentInterior = memo(function MonumentInterior({
  monument,
  sources,
  onBack,
  onUpdateChapters,
  onReviewSection,
}: Props) {
  const { cards } = useCardContext();
  const navigate = useNavigate();
  const allCards = useMemo(() => Object.values(cards), [cards]);
  const catCards = useMemo(
    () => allCards.filter((c) => c.category === monument.category),
    [allCards, monument.category],
  );

  const sourceHierarchy = useSourceHierarchy(allCards, sources, monument.category);

  // Build fallback tree from subcategories if no source links
  const fallbackTree = useMemo<HierarchyNode[]>(() => {
    if (sourceHierarchy.hasSourceLinks) return [];
    const bySubcat = new Map<string, typeof catCards>();
    for (const card of catCards) {
      const sub = card.subcategory || "Ostalo";
      if (!bySubcat.has(sub)) bySubcat.set(sub, []);
      bySubcat.get(sub)!.push(card);
    }
    const nodes: HierarchyNode[] = [];
    for (const [name, subCards] of bySubcat) {
      const levels = [0, 0, 0, 0, 0, 0];
      for (const c of subCards) levels[getCardMasteryLevel(c)]++;
      nodes.push({
        name,
        cardCount: subCards.length,
        levels,
        children: [],
      });
    }
    nodes.sort((a, b) => b.cardCount - a.cardCount);
    return nodes;
  }, [catCards, sourceHierarchy.hasSourceLinks]);

  const tree = sourceHierarchy.hasSourceLinks ? sourceHierarchy.tree : fallbackTree;
  const mode = sourceHierarchy.hasSourceLinks ? sourceHierarchy.mode : "B";

  // Drill-down state: null = overview, string = subcategory detail
  const [drillDown, setDrillDown] = useMemo(() => {
    // We need useState but can't call hooks conditionally — handled below
    return [null, () => {}] as any;
  }, []);

  // Actually use state properly
  return <InteriorContent
    monument={monument}
    tree={tree}
    mode={mode}
    catCards={catCards}
    allCards={allCards}
    sources={sources}
    onBack={onBack}
    onUpdateChapters={onUpdateChapters}
    onReviewSection={onReviewSection}
  />;
});

/** Separated to allow useState */
import { useState } from "react";

interface InteriorContentProps {
  monument: Monument;
  tree: HierarchyNode[];
  mode: string;
  catCards: any[];
  allCards: any[];
  sources: Source[];
  onBack: () => void;
  onUpdateChapters?: (updates: { id: string; chapter: string; chapterOrder: number }[]) => void;
  onReviewSection?: (cardId: string, sectionId: string, grade: number) => void;
}

const InteriorContent = memo(function InteriorContent({
  monument,
  tree,
  mode,
  catCards,
  allCards,
  sources,
  onBack,
  onUpdateChapters,
  onReviewSection,
}: InteriorContentProps) {
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const navigate = useNavigate();

  const overdueCount = useMemo(() => {
    const now = Date.now();
    return catCards.filter((c: any) =>
      c.sections.some((s: any) => s.nextReview && s.nextReview <= now),
    ).length;
  }, [catCards]);

  // If drilled into a subcategory, show MentalSkeleton
  if (selectedSub && onUpdateChapters && onReviewSection) {
    return (
      <motion.div
        key="detail"
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -60 }}
        transition={{ duration: 0.25 }}
        className="space-y-3"
      >
        <Suspense fallback={<TabSkeleton />}>
          <MentalSkeleton
            cards={allCards}
            category={monument.category}
            subcategory={selectedSub}
            onBack={() => setSelectedSub(null)}
            onUpdateChapters={onUpdateChapters}
            onReviewSection={onReviewSection}
          />
        </Suspense>
      </motion.div>
    );
  }

  const materialIcon = MATERIAL_ICONS[monument.material];
  const modeLabel = mode === "A" ? "po izvoru" : "po potkategoriji";

  return (
    <motion.div
      key="interior"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="glass-card p-5 border-gold/20">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-secondary transition-colors shrink-0"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>

          <div className="shrink-0 h-16 w-16 flex items-center justify-center">
            <MonumentSVG buildingType={monument.buildingType} tier={monument.material} />
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold font-display text-gold truncate">
              {materialIcon} {monument.category}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {catCards.length} kartica • {tree.length} {mode === "A" ? "izvora" : "grupa"} ({modeLabel}) • Dominatio {monument.mastery}%
            </p>
          </div>

          {overdueCount > 0 && (
            <Button
              size="sm"
              onClick={() => navigate(`/review?category=${encodeURIComponent(monument.category)}`)}
              className="gap-1.5 bg-gold hover:bg-gold/90 text-gold-foreground font-display shrink-0"
            >
              <Play className="h-3.5 w-3.5" />
              {overdueCount}
            </Button>
          )}
        </div>
      </div>

      {/* Interior: Architectural nodes */}
      <ScrollArea className="max-h-[calc(100vh-280px)]">
        {mode === "A" ? (
          // Mode A: Wings (Master Sources) containing nodes
          <div className="space-y-6">
            {tree.map((wing, wi) => {
              const wingAvgStab = computeAvgStabilityFromLevels(catCards, wing.name, monument.category);
              return (
                <div key={wing.name} className="space-y-3">
                  {/* Wing header — stone lintel */}
                  <div className="flex items-center gap-3 px-2">
                    <div className="h-px flex-1 bg-gold/20" />
                    <h3 className="text-xs font-display text-gold uppercase tracking-widest shrink-0">
                      {wing.name}
                    </h3>
                    <div className="h-px flex-1 bg-gold/20" />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {wing.children.map((child, ci) => (
                      <ArchNode
                        key={child.name}
                        name={child.name}
                        cardCount={child.cardCount}
                        levels={child.levels}
                        avgStability={computeAvgStability(child.cards)}
                        index={wi * 10 + ci}
                        onClick={() => setSelectedSub(child.name)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Mode B: Direct column cards
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tree.map((node, i) => {
              const nodeCards = catCards.filter(
                (c: any) => (c.subcategory || "Ostalo") === node.name,
              );
              return (
                <ArchNode
                  key={node.name}
                  name={node.name}
                  cardCount={node.cardCount}
                  levels={node.levels}
                  avgStability={computeAvgStability(nodeCards)}
                  index={i}
                  onClick={() => setSelectedSub(node.name)}
                />
              );
            })}
          </div>
        )}

        {tree.length === 0 && (
          <div className="flex items-center justify-center min-h-[20vh]">
            <p className="text-sm text-muted-foreground italic font-display">
              Nulla structura in hoc monumento.
            </p>
          </div>
        )}
      </ScrollArea>
    </motion.div>
  );
});

function computeAvgStabilityFromLevels(
  catCards: any[],
  _wingName: string,
  _category: string,
): number {
  // Simple fallback — actual avg is computed per-node
  return 0;
}
