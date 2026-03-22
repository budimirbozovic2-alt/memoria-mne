import { useState, useMemo, useCallback } from "react";
import { Card, SectionState } from "@/lib/spaced-repetition";
import { getCardMasteryLevel, getMasteryColor, MASTERY_LEVELS } from "@/components/KnowledgeMap";
import { default as ArrowLeft } from "lucide-react/dist/esm/icons/arrow-left";
import { default as Layers } from "lucide-react/dist/esm/icons/layers";
import { default as BarChart3 } from "lucide-react/dist/esm/icons/bar-chart-3";
import { default as GripVertical } from "lucide-react/dist/esm/icons/grip-vertical";
import { motion } from "framer-motion";
import {
  DndContext, PointerSensor, useSensor, useSensors,
  DragEndEvent, DragOverlay, DragStartEvent, useDroppable, useDraggable,
} from "@dnd-kit/core";
import { toast } from "sonner";

type GroupMode = "chapter" | "mastery";

interface Props {
  cards: Card[];
  category: string;
  subcategory: string;
  onBack: () => void;
  onUpdateChapters: (updates: { id: string; chapter: string; chapterOrder: number }[]) => void;
}

const UNASSIGNED = "__unassigned__";

function getChapters(cards: Card[]): string[] {
  const chapters = new Set<string>();
  cards.forEach(c => { if (c.chapter) chapters.add(c.chapter); });
  return Array.from(chapters).sort((a, b) => {
    const nA = a.match(/(\d+)/)?.[1];
    const nB = b.match(/(\d+)/)?.[1];
    if (nA && nB) return parseInt(nA) - parseInt(nB);
    return a.localeCompare(b);
  });
}

// ── Droppable Column ──
function DroppableColumn({ id, title, color, count, children }: {
  id: string; title: string; color: string; count: number; children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[240px] max-w-[300px] flex-1 rounded-xl border transition-colors ${
        isOver ? "border-primary bg-primary/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-center gap-2 p-3 border-b">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <h3 className="text-sm font-medium truncate flex-1">{title}</h3>
        <span className="text-xs text-muted-foreground bg-secondary rounded-full px-2 py-0.5">{count}</span>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[60vh] min-h-[100px]">
        {children}
        {count === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6 opacity-50">Prevuci kartice ovdje</p>
        )}
      </div>
    </div>
  );
}

// ── Draggable Card ──
function DraggableCard({ card }: { card: Card }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { card },
  });

  const level = getCardMasteryLevel(card);
  const masteryColor = getMasteryColor(level);
  const totalSections = card.sections.length;
  const learnedSections = card.sections.filter(
    s => s.state === SectionState.Review || s.state === SectionState.Relearning
  ).length;
  const pct = totalSections > 0 ? Math.round((learnedSections / totalSections) * 100) : 0;

  const style = transform ? {
    transform: `translate(${transform.x}px, ${transform.y}px)`,
    zIndex: 50,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-start gap-2 p-3 rounded-lg border bg-background hover:bg-secondary/40 transition-colors cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-40 shadow-lg" : ""
      }`}
      {...listeners}
      {...attributes}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug line-clamp-2">{card.question}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex h-1 flex-1 rounded-full overflow-hidden bg-secondary">
            <div className="rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: masteryColor }} />
          </div>
          <span className="text-[10px] text-muted-foreground">{pct}%</span>
        </div>
        {card.chapter && (
          <p className="text-[10px] text-muted-foreground mt-1 truncate">{card.chapter}</p>
        )}
      </div>
      <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: masteryColor }} />
    </div>
  );
}

// ── Drag Overlay Card ──
function OverlayCard({ card }: { card: Card }) {
  const level = getCardMasteryLevel(card);
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg border bg-background shadow-2xl w-[260px]">
      <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug line-clamp-2">{card.question}</p>
      </div>
      <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: getMasteryColor(level) }} />
    </div>
  );
}

export default function KanbanBoard({ cards, category, subcategory, onBack, onUpdateChapters }: Props) {
  const [groupMode, setGroupMode] = useState<GroupMode>("chapter");
  const [draggedCard, setDraggedCard] = useState<Card | null>(null);

  const filtered = useMemo(
    () => cards.filter(c => c.category === category && c.subcategory === subcategory),
    [cards, category, subcategory]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ── Column definitions ──
  const columns = useMemo(() => {
    if (groupMode === "mastery") {
      return MASTERY_LEVELS.map(ml => ({
        id: `mastery-${ml.level}`,
        title: ml.label,
        color: ml.color,
        cards: filtered.filter(c => getCardMasteryLevel(c) === ml.level),
      }));
    }
    // Chapter mode
    const chapters = getChapters(filtered);
    const cols = chapters.map(ch => ({
      id: `chapter-${ch}`,
      title: ch,
      color: "hsl(var(--primary))",
      cards: filtered.filter(c => c.chapter === ch),
    }));
    const unassigned = filtered.filter(c => !c.chapter);
    if (unassigned.length > 0 || cols.length === 0) {
      cols.push({
        id: `chapter-${UNASSIGNED}`,
        title: "Nekategorisane",
        color: "hsl(var(--muted-foreground))",
        cards: unassigned,
      });
    }
    return cols;
  }, [filtered, groupMode]);

  const handleDragStart = useCallback((e: DragStartEvent) => {
    const card = filtered.find(c => c.id === e.active.id);
    if (card) setDraggedCard(card);
  }, [filtered]);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setDraggedCard(null);
    const { active, over } = e;
    if (!over || !active) return;

    const cardId = active.id as string;
    const targetColId = over.id as string;

    if (groupMode === "chapter") {
      // Extract chapter name from column id
      const chapterName = targetColId.replace("chapter-", "");
      const card = filtered.find(c => c.id === cardId);
      if (!card) return;

      const newChapter = chapterName === UNASSIGNED ? "" : chapterName;
      if (card.chapter === newChapter) return;

      onUpdateChapters([{ id: cardId, chapter: newChapter, chapterOrder: 0 }]);
      toast.success(newChapter ? `Premješteno u "${newChapter}"` : "Kartica uklonjena iz glave");
    } else {
      // Mastery mode — no actual data change, just informational
      toast.info("Mastery nivo se ne može ručno mijenjati — ovisi o ponavljanjima");
    }
  }, [groupMode, filtered, onUpdateChapters]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-serif truncate">{subcategory}</h2>
          <p className="text-xs text-muted-foreground">{filtered.length} kartica • Kanban prikaz</p>
        </div>
        {/* Group toggle */}
        <div className="flex items-center gap-1 border rounded-lg p-0.5">
          <button
            onClick={() => setGroupMode("chapter")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              groupMode === "chapter" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Glave
          </button>
          <button
            onClick={() => setGroupMode("mastery")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              groupMode === "mastery" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Mastery
          </button>
        </div>
      </div>

      {/* Kanban board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
          {columns.map(col => (
            <DroppableColumn key={col.id} id={col.id} title={col.title} color={col.color} count={col.cards.length}>
              {col.cards.map(card => (
                <DraggableCard key={card.id} card={card} />
              ))}
            </DroppableColumn>
          ))}
        </div>

        <DragOverlay>
          {draggedCard && <OverlayCard card={draggedCard} />}
        </DragOverlay>
      </DndContext>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 p-3 rounded-xl border bg-card">
        {MASTERY_LEVELS.map(ml => (
          <div key={ml.level} className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: ml.color }} />
            <span className="text-muted-foreground">{ml.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
