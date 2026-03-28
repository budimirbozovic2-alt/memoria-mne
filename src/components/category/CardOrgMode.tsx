import { useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  DndContext, closestCenter, pointerWithin, DragOverlay, MeasuringStrategy,
  useDroppable,
  type DragStartEvent, type DragEndEvent,
  type CollisionDetection,
  rectIntersection,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, Plus, FolderOpen, GripVertical, Edit2, Trash2, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Card } from "@/lib/spaced-repetition";
import { type CategoryRecord } from "@/lib/db";
import { cn } from "@/lib/utils";

interface Props {
  cards: Card[];
  categoryId: string;
  category: CategoryRecord;
  patchCard: (id: string, fn: (c: Card) => Card) => void;
  addSubcategory: (categoryId: string, name: string) => void;
  renameSubcategory: (categoryId: string, oldName: string, newName: string) => void;
  deleteSubcategory: (categoryId: string, name: string) => void;
}

interface TreeNode {
  subcategory: string;
  chapters: { chapter: string; cards: Card[] }[];
  unassigned: Card[];
}

/** Encode a droppable chapter zone ID */
const chapterDropId = (sub: string, chapter: string) => `__drop__${sub}__${chapter}`;
const parseChapterDropId = (id: string) => {
  if (!id.startsWith("__drop__")) return null;
  const rest = id.slice("__drop__".length);
  const sepIdx = rest.indexOf("__");
  if (sepIdx < 0) return null;
  return { subcategory: rest.slice(0, sepIdx), chapter: rest.slice(sepIdx + 2) };
};

function buildTree(cards: Card[]): TreeNode[] {
  const map = new Map<string, Map<string, Card[]>>();
  const unassignedMap = new Map<string, Card[]>();

  for (const card of cards) {
    const sub = card.subcategory || "(Bez potkategorije)";
    if (!map.has(sub)) { map.set(sub, new Map()); unassignedMap.set(sub, []); }
    if (card.chapter) {
      const chMap = map.get(sub)!;
      if (!chMap.has(card.chapter)) chMap.set(card.chapter, []);
      chMap.get(card.chapter)!.push(card);
    } else {
      unassignedMap.get(sub)!.push(card);
    }
  }

  const result: TreeNode[] = [];
  for (const [sub, chMap] of map) {
    const chapters = Array.from(chMap.entries())
      .map(([chapter, cards]) => ({
        chapter,
        cards: cards.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
      }))
      .sort((a, b) => {
        const aOrder = a.cards[0]?.chapterOrder ?? 0;
        const bOrder = b.cards[0]?.chapterOrder ?? 0;
        return aOrder - bOrder;
      });
    result.push({ subcategory: sub, chapters, unassigned: unassignedMap.get(sub) || [] });
  }

  return result.sort((a, b) => a.subcategory.localeCompare(b.subcategory));
}

// ─── Sortable card tile ─────────────────────────────────
function SortableCardTile({ card, index }: { card: Card; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded border bg-background px-3 py-1.5 group">
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </span>
      <span className="text-[10px] text-muted-foreground w-5 text-right shrink-0">{index + 1}.</span>
      <span className="text-xs text-foreground truncate flex-1">{card.question || "(Bez pitanja)"}</span>
    </div>
  );
}

// ─── Droppable chapter zone ─────────────────────────────
function DroppableChapterHeader({ sub, chapter, count }: { sub: string; chapter: string; count: number }) {
  const dropId = chapterDropId(sub, chapter);
  const { setNodeRef, isOver } = useDroppable({ id: dropId });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 py-1.5 rounded transition-colors",
        isOver && "bg-primary/10 text-primary ring-1 ring-primary/30"
      )}
    >
      {chapter}
      <Badge variant="secondary" className="ml-2 text-[9px] h-4 px-1">{count}</Badge>
    </div>
  );
}

// ─── Drag overlay (ghost) ───────────────────────────────
function CardDragOverlay({ card }: { card: Card }) {
  return (
    <div className="flex items-center gap-2 rounded border bg-card shadow-xl px-3 py-1.5 w-80 pointer-events-none">
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs text-foreground truncate flex-1">{card.question || "(Bez pitanja)"}</span>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────
export default function CardOrgMode({ cards, categoryId, category, patchCard, addSubcategory, renameSubcategory, deleteSubcategory }: Props) {
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());
  const [newSubName, setNewSubName] = useState("");
  const [newChapterName, setNewChapterName] = useState("");
  const [addingChapterFor, setAddingChapterFor] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingSubName, setEditingSubName] = useState<string | null>(null);
  const [editSubValue, setEditSubValue] = useState("");
  const [editingChapter, setEditingChapter] = useState<{ sub: string; chapter: string } | null>(null);
  const [editChapterValue, setEditChapterValue] = useState("");

  const handleRenameSubcategory = useCallback((oldName: string) => {
    const newName = editSubValue.trim();
    if (!newName || newName === oldName) { setEditingSubName(null); return; }
    // If it's a real subcategory (not the placeholder), rename via context
    if (oldName !== "(Bez potkategorije)") {
      renameSubcategory(categoryId, oldName, newName);
    }
    // Also update all cards with old subcategory name
    cards.filter(c => (c.subcategory || "(Bez potkategorije)") === oldName).forEach(c => {
      patchCard(c.id, card => ({ ...card, subcategory: newName }));
    });
    setEditingSubName(null);
  }, [editSubValue, categoryId, renameSubcategory, cards, patchCard]);

  const handleDeleteSubcategory = useCallback((subName: string) => {
    if (subName === "(Bez potkategorije)") return;
    // Unassign all cards from this subcategory
    cards.filter(c => c.subcategory === subName).forEach(c => {
      patchCard(c.id, card => ({ ...card, subcategory: undefined }));
    });
    deleteSubcategory(categoryId, subName);
  }, [categoryId, deleteSubcategory, cards, patchCard]);

  const handleRenameChapter = useCallback((sub: string, oldChapter: string) => {
    const newName = editChapterValue.trim();
    if (!newName || newName === oldChapter) { setEditingChapter(null); return; }
    const subFilter = sub === "(Bez potkategorije)" ? "" : sub;
    cards.filter(c => (c.subcategory || "") === (subFilter || "") && c.chapter === oldChapter).forEach(c => {
      patchCard(c.id, card => ({ ...card, chapter: newName }));
    });
    setEditingChapter(null);
  }, [editChapterValue, cards, patchCard]);

  const handleDeleteChapter = useCallback((sub: string, chapter: string) => {
    const subFilter = sub === "(Bez potkategorije)" ? "" : sub;
    cards.filter(c => (c.subcategory || "") === (subFilter || "") && c.chapter === chapter).forEach(c => {
      patchCard(c.id, card => ({ ...card, chapter: undefined }));
    });
  }, [cards, patchCard]);

  const tree = useMemo(() => buildTree(cards), [cards]);
  const cardMap = useMemo(() => new Map(cards.map(c => [c.id, c])), [cards]);

  /** Find which sub+chapter a card belongs to */
  const findCardContainer = useCallback((cardId: string): { sub: string; chapter: string } | null => {
    for (const node of tree) {
      for (const ch of node.chapters) {
        if (ch.cards.some(c => c.id === cardId)) {
          return { sub: node.subcategory, chapter: ch.chapter };
        }
      }
    }
    return null;
  }, [tree]);

  const toggleSub = useCallback((sub: string) => {
    setExpandedSubs(prev => {
      const next = new Set(prev);
      if (next.has(sub)) next.delete(sub); else next.add(sub);
      return next;
    });
  }, []);

  const handleAddSubcategory = useCallback(() => {
    const name = newSubName.trim();
    if (!name) return;
    addSubcategory(categoryId, name);
    setNewSubName("");
  }, [newSubName, categoryId, addSubcategory]);

  const assignChapter = useCallback((cardId: string, chapter: string) => {
    patchCard(cardId, c => ({ ...c, chapter: chapter || undefined }));
  }, [patchCard]);

  const handleAddChapter = useCallback((sub: string) => {
    const name = newChapterName.trim();
    if (!name) return;
    const unassigned = cards.filter(c => (c.subcategory || "(Bez potkategorije)") === sub && !c.chapter);
    if (unassigned.length > 0) {
      patchCard(unassigned[0].id, c => ({ ...c, chapter: name }));
    }
    setNewChapterName("");
    setAddingChapterFor(null);
  }, [newChapterName, cards, patchCard]);

  // ─── DnD handlers ─────────────────────────────────────
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeCardId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a chapter header zone
    const dropTarget = parseChapterDropId(overId);
    if (dropTarget) {
      // Move card to this chapter (append at end)
      const targetSub = dropTarget.subcategory === "(Bez potkategorije)" ? "" : dropTarget.subcategory;
      patchCard(activeCardId, c => ({
        ...c,
        chapter: dropTarget.chapter,
        subcategory: targetSub,
        sortOrder: 9999, // will be at the end
      }));
      return;
    }

    // Dropped on another card
    const overCard = cardMap.get(overId);
    if (!overCard) return;

    const activeContainer = findCardContainer(activeCardId);
    const overContainer = findCardContainer(overId);
    if (!activeContainer || !overContainer) return;

    const sameContainer = activeContainer.sub === overContainer.sub && activeContainer.chapter === overContainer.chapter;

    if (sameContainer) {
      // Reorder within same chapter
      const chapterNode = tree
        .find(n => n.subcategory === overContainer.sub)
        ?.chapters.find(ch => ch.chapter === overContainer.chapter);
      if (!chapterNode) return;

      const oldIndex = chapterNode.cards.findIndex(c => c.id === activeCardId);
      const newIndex = chapterNode.cards.findIndex(c => c.id === overId);
      if (oldIndex < 0 || newIndex < 0) return;

      const reordered = arrayMove(chapterNode.cards, oldIndex, newIndex);
      reordered.forEach((c, i) => {
        patchCard(c.id, card => ({ ...card, sortOrder: i }));
      });
    } else {
      // Cross-chapter move: move card to target chapter at the drop position
      const targetSub = overContainer.sub === "(Bez potkategorije)" ? "" : overContainer.sub;
      const targetChapterNode = tree
        .find(n => n.subcategory === overContainer.sub)
        ?.chapters.find(ch => ch.chapter === overContainer.chapter);
      if (!targetChapterNode) return;

      // Insert at the position of the over card
      const overIdx = targetChapterNode.cards.findIndex(c => c.id === overId);
      const newList = targetChapterNode.cards.filter(c => c.id !== activeCardId);
      newList.splice(overIdx, 0, cardMap.get(activeCardId)!);

      // Update the moved card's chapter/subcategory
      patchCard(activeCardId, c => ({
        ...c,
        chapter: overContainer.chapter,
        subcategory: targetSub,
      }));

      // Reorder all cards in target chapter
      newList.forEach((c, i) => {
        patchCard(c.id, card => ({ ...card, sortOrder: i }));
      });
    }
  }, [cardMap, tree, patchCard, findCardContainer]);

  const activeCard = activeId ? cardMap.get(activeId) : null;

  if (cards.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        Nema kartica za organizaciju.
      </div>
    );
  }

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
    >
      <div className="space-y-3">
        {tree.map(node => {
          const isExpanded = expandedSubs.has(node.subcategory);
          const totalCards = node.chapters.reduce((sum, ch) => sum + ch.cards.length, 0) + node.unassigned.length;

          return (
            <div key={node.subcategory} className="rounded-lg border bg-card overflow-hidden">
              {/* Subcategory header */}
              <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-accent/30 transition-colors">
                <button onClick={() => toggleSub(node.subcategory)} className="flex items-center gap-2 flex-1 text-left min-w-0">
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <FolderOpen className="h-4 w-4 text-primary/70" />
                  {editingSubName === node.subcategory ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <Input value={editSubValue} onChange={e => setEditSubValue(e.target.value)} className="h-6 text-xs flex-1"
                        autoFocus onKeyDown={e => { if (e.key === "Enter") handleRenameSubcategory(node.subcategory); if (e.key === "Escape") setEditingSubName(null); }} />
                      <button onClick={() => handleRenameSubcategory(node.subcategory)} className="p-0.5 hover:bg-secondary rounded text-green-500"><Check className="h-3 w-3" /></button>
                      <button onClick={() => setEditingSubName(null)} className="p-0.5 hover:bg-secondary rounded text-muted-foreground"><X className="h-3 w-3" /></button>
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-foreground flex-1 truncate">{node.subcategory}</span>
                  )}
                </button>
                <Badge variant="secondary" className="text-[10px]">{totalCards}</Badge>
                {!editingSubName && node.subcategory !== "(Bez potkategorije)" && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => { setEditingSubName(node.subcategory); setEditSubValue(node.subcategory); }}
                      className="p-1 rounded hover:bg-secondary"><Edit2 className="h-3 w-3 text-muted-foreground" /></button>
                    <button onClick={() => handleDeleteSubcategory(node.subcategory)}
                      className="p-1 rounded hover:bg-destructive/10"><Trash2 className="h-3 w-3 text-destructive" /></button>
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="border-t px-3 py-2 space-y-2">
                  {/* Chapters with DnD */}
                  {node.chapters.map(ch => (
                    <div key={ch.chapter} className="space-y-1">
                      <DroppableChapterHeader sub={node.subcategory} chapter={ch.chapter} count={ch.cards.length} />
                      <SortableContext items={ch.cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
                        {ch.cards.map((card, idx) => (
                          <SortableCardTile key={card.id} card={card} index={idx} />
                        ))}
                      </SortableContext>
                    </div>
                  ))}

                  {/* Unassigned cards */}
                  {node.unassigned.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground italic px-1 py-1">Bez glave</div>
                      {node.unassigned.map(card => {
                        const availableChapters = node.chapters.map(ch => ch.chapter);
                        return (
                          <div key={card.id} className="flex items-center gap-2 rounded border border-dashed bg-background px-3 py-1.5">
                            <span className="text-xs text-foreground truncate flex-1">{card.question || "(Bez pitanja)"}</span>
                            {availableChapters.length > 0 && (
                              <Select onValueChange={v => assignChapter(card.id, v)}>
                                <SelectTrigger className="h-6 w-28 text-[10px]">
                                  <SelectValue placeholder="Dodijeli glavu" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableChapters.map(ch => (
                                    <SelectItem key={ch} value={ch} className="text-xs">{ch}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add chapter inline */}
                  {addingChapterFor === node.subcategory ? (
                    <div className="flex items-center gap-2 px-1">
                      <Input
                        value={newChapterName}
                        onChange={e => setNewChapterName(e.target.value)}
                        placeholder="Naziv glave..."
                        className="h-7 text-xs flex-1"
                        autoFocus
                        onKeyDown={e => { if (e.key === "Enter") handleAddChapter(node.subcategory); if (e.key === "Escape") setAddingChapterFor(null); }}
                      />
                      <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => handleAddChapter(node.subcategory)}>
                        Dodaj
                      </Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground" onClick={() => { setAddingChapterFor(node.subcategory); setNewChapterName(""); }}>
                      <Plus className="h-3 w-3" /> Dodaj glavu
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Add subcategory */}
        <div className="flex items-center gap-2">
          <Input
            value={newSubName}
            onChange={e => setNewSubName(e.target.value)}
            placeholder="Nova potkategorija..."
            className="h-8 text-xs flex-1"
            onKeyDown={e => { if (e.key === "Enter") handleAddSubcategory(); }}
          />
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleAddSubcategory} disabled={!newSubName.trim()}>
            <Plus className="h-3 w-3" /> Dodaj
          </Button>
        </div>
      </div>

      {/* Drag overlay — rendered via portal to avoid layout offset */}
      {createPortal(
        <DragOverlay dropAnimation={null}>
          {activeCard ? <CardDragOverlay card={activeCard} /> : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}
