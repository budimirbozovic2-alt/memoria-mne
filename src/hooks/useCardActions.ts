import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { CategoryRecord, SubcategoryNode } from "@/lib/db";
import { Card, FrequencyTag, CardSourceType } from "@/lib/spaced-repetition";
import { toast } from "sonner";
import { useCardDraftAutosave, loadCardDraft, buildDraftKey, type CardDraftSnapshot } from "./useCardDraftAutosave";

// ─── Types ──────────────────────────────────────────────
export interface SectionInput {
  title: string;
  content: string;
}

export type CardType = "essay" | "flash";
export type FormWidth = "compact" | "normal" | "wide" | "full";

interface UseCardActionsProps {
  categories: string[];
  subcategories: Record<string, string[]>;
  categoryRecords?: CategoryRecord[];
  editCard?: Card | null;
  onSave: (question: string, sections: SectionInput[], categoryId: string, subcategoryId?: string, chapterId?: string) => void;
  onSaveFlash: (question: string, answer: string, categoryId: string, subcategoryId?: string) => void;
  onUpdate?: (id: string, updates: {
    question?: string;
    sections?: SectionInput[];
    categoryId?: string;
    subcategoryId?: string;
    chapterId?: string;
    frequencyTag?: FrequencyTag;
    sourceType?: CardSourceType;
  }) => void;
}

// ─── Helpers ────────────────────────────────────────────
const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();

export function parseHtmlToParagraphs(html: string): string[] {
  const div = document.createElement("div");
  div.innerHTML = html;
  const blocks: string[] = [];
  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) blocks.push(text);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (["p", "div", "br", "li"].includes(tag)) {
        const inner = el.innerHTML.trim();
        if (inner && inner !== "<br>") blocks.push(inner);
      } else {
        const outer = el.outerHTML.trim();
        if (outer) blocks.push(outer);
      }
    }
  };
  if (div.children.length === 0) {
    const parts = html.split(/<br\s*\/?>/gi).map(s => s.trim()).filter(Boolean);
    return parts.length > 0 ? parts : [html];
  }
  div.childNodes.forEach(processNode);
  return blocks.length > 0 ? blocks : [html];
}

// ─── Validation ─────────────────────────────────────────
export interface ValidationErrors {
  question?: string;
  flashAnswer?: string;
  sections?: string;
}

function validate(
  cardType: CardType,
  question: string,
  flashAnswer: string,
  sections: SectionInput[],
): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!stripHtml(question)) {
    errors.question = "Pitanje ne smije biti prazno.";
  }
  if (cardType === "flash") {
    if (!stripHtml(flashAnswer)) {
      errors.flashAnswer = "Odgovor ne smije biti prazan.";
    }
  } else {
    if (sections.some(s => !stripHtml(s.content))) {
      errors.sections = "Sve cjeline moraju imati sadržaj.";
    }
  }
  return errors;
}

// ═════════════════════════════════════════════════════════
// Hook
// ═════════════════════════════════════════════════════════
export function useCardActions({ categories, subcategories, categoryRecords, editCard, onSave, onSaveFlash, onUpdate }: UseCardActionsProps) {
  // ── Core state ────────────────────────────────────────
  const [cardType, setCardType] = useState<CardType>(editCard?.type || "essay");
  const [question, setQuestion] = useState(editCard?.question ?? "");
  const [flashAnswer, setFlashAnswer] = useState(
    editCard?.type === "flash" ? editCard.sections[0]?.content ?? "" : "",
  );
  const [sections, setSections] = useState<SectionInput[]>(
    editCard && editCard.type !== "flash"
      ? editCard.sections.map(s => ({ title: s.title, content: s.content }))
      : [{ title: "Cjelina 1", content: "" }],
  );

  // ── Metadata state ────────────────────────────────────
  const [categoryId, setCategoryId] = useState(editCard?.categoryId ?? categories[0] ?? "");
  const [subcategoryId, setSubcategoryId] = useState(editCard?.subcategoryId ?? "");
  const [chapterId, setChapterId] = useState(editCard?.chapterId ?? "");
  const [newCategory, setNewCategory] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);
  const [newSubcategory, setNewSubcategory] = useState("");
  const [showNewSub, setShowNewSub] = useState(false);
  const [newChapter, setNewChapter] = useState("");
  const [showNewChapter, setShowNewChapter] = useState(false);

  // ── UI state ──────────────────────────────────────────
  const [formWidth, setFormWidth] = useState<FormWidth>("wide");
  const [cuttingIndex, setCuttingIndex] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  // ── New metadata fields ───────────────────────────────
  const [frequencyTag, setFrequencyTag] = useState<FrequencyTag | "">(editCard?.frequencyTag ?? "");
  const [sourceType, setSourceType] = useState<CardSourceType | "">(editCard?.sourceType ?? "");

  // ── Draft autosave (B9) ───────────────────────────────
  // Stable per-form key. New cards get one slot per category; edits get a
  // dedicated slot bound to the card id.
  const initialCategoryIdRef = useRef<string>(editCard?.categoryId ?? categories[0] ?? "");
  const draftKey = useMemo(
    () => buildDraftKey(editCard?.id ?? null, initialCategoryIdRef.current),
    [editCard?.id],
  );

  // Surface a "restore draft?" banner. We load once at mount and let the
  // consumer decide whether to apply or discard.
  const [pendingDraft, setPendingDraft] = useState<CardDraftSnapshot | null>(null);
  const [pendingDraftSavedAt, setPendingDraftSavedAt] = useState<number | null>(null);
  useEffect(() => {
    const stored = loadCardDraft(draftKey);
    if (stored) {
      setPendingDraft(stored);
      setPendingDraftSavedAt(stored.savedAt);
    }
    // Only on mount per draftKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  const draftSnapshot: CardDraftSnapshot = useMemo(() => ({
    cardType, question, flashAnswer, sections,
    categoryId, subcategoryId, chapterId,
    frequencyTag, sourceType,
  }), [cardType, question, flashAnswer, sections, categoryId, subcategoryId, chapterId, frequencyTag, sourceType]);

  // Disable autosave while the restore banner is awaiting a decision so we
  // don't overwrite the stored draft with the empty initial form state.
  const autosaveEnabled = pendingDraft === null;
  const { clearDraft, flushDraft: _flushDraft } = useCardDraftAutosave(draftKey, draftSnapshot, autosaveEnabled);
  void _flushDraft;

  const restoreDraft = useCallback(() => {
    if (!pendingDraft) return;
    setCardType(pendingDraft.cardType);
    setQuestion(pendingDraft.question);
    setFlashAnswer(pendingDraft.flashAnswer);
    setSections(pendingDraft.sections.length > 0 ? pendingDraft.sections : [{ title: "Cjelina 1", content: "" }]);
    setCategoryId(pendingDraft.categoryId);
    setSubcategoryId(pendingDraft.subcategoryId);
    setChapterId(pendingDraft.chapterId);
    setFrequencyTag(pendingDraft.frequencyTag);
    setSourceType(pendingDraft.sourceType);
    setPendingDraft(null);
    setPendingDraftSavedAt(null);
  }, [pendingDraft]);

  const dismissDraft = useCallback(() => {
    clearDraft();
    setPendingDraft(null);
    setPendingDraftSavedAt(null);
  }, [clearDraft]);

  // ── Derived ───────────────────────────────────────────
  const availableSubs: { id: string; name: string }[] = useMemo(() => {
    const catRec = categoryRecords?.find(r => r.id === categoryId);
    if (!catRec) return [];
    return (catRec.subcategories || []).map((n: any) =>
      typeof n === "string" ? { id: n, name: n } : { id: n.id, name: n.name }
    );
  }, [categoryId, categoryRecords]);

  // ── Linked source gazette info (read-only) ────────────
  const [linkedGazetteInfo, setLinkedGazetteInfo] = useState<string | null>(null);
  useEffect(() => {
    if (!editCard?.sourceId) { setLinkedGazetteInfo(null); return; }
    import("@/lib/db").then(({ db }) => {
      db.sources.get(editCard.sourceId!).then(source => {
        setLinkedGazetteInfo(source?.officialGazetteInfo ?? null);
      });
    });
  }, [editCard?.sourceId]);

  // ── Load available chapters from SubcategoryNode tree ──
  // NOTE: All legacy string→object normalization happens once in useCardBootstrap
  // and is persisted to IDB. We MUST NOT generate UUIDs in the render path here:
  // doing so produces a fresh id on every memo recompute, breaking React identity
  // for child Select options (focus loss, mount/unmount thrash). If we ever
  // encounter a legacy string node here, skip it defensively and warn in dev.
  const availableChapters = useMemo((): { id: string; name: string }[] => {
    const sub = showNewSub && newSubcategory.trim() ? newSubcategory.trim() : subcategoryId;
    const cat = showNewCat && newCategory.trim() ? newCategory.trim() : categoryId;
    if (!sub || !cat || !categoryRecords) return [];
    const catRec = categoryRecords.find(r => r.id === cat);
    if (!catRec) return [];
    const rawNodes = (catRec.subcategories as unknown[]) || [];
    const nodes: SubcategoryNode[] = [];
    for (const s of rawNodes) {
      if (typeof s === "string") {
        if (import.meta.env.DEV) {
          console.warn("[useCardActions] legacy string subcategory encountered in render; bootstrap should have normalized it:", s);
        }
        continue;
      }
      nodes.push(s as SubcategoryNode);
    }
    const node = nodes.find(n => n.id === sub);
    if (!node) return [];
    const result: { id: string; name: string }[] = [];
    for (const ch of (node.chapters || []) as unknown[]) {
      if (typeof ch === "string") {
        if (import.meta.env.DEV) {
          console.warn("[useCardActions] legacy string chapter encountered in render:", ch);
        }
        continue;
      }
      const c = ch as { id: string; name: string };
      if (c.id && c.name) result.push({ id: c.id, name: c.name });
    }
    return result;
  }, [categoryId, subcategoryId, showNewCat, newCategory, showNewSub, newSubcategory, categoryRecords]);

  // ── Section actions ───────────────────────────────────
  const addSection = useCallback(() => {
    setSections(prev => [...prev, { title: `Cjelina ${prev.length + 1}`, content: "" }]);
  }, []);

  const removeSection = useCallback((index: number) => {
    setSections(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }, []);

  const updateSection = useCallback((index: number, field: keyof SectionInput, value: string) => {
    setSections(prev => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }, []);

  const moveSection = useCallback((from: number, to: number) => {
    setSections(prev => {
      if (from < 0 || from >= prev.length || to < 0 || to >= prev.length) return prev;
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  }, []);

  const handleCut = useCallback((sectionIndex: number, paragraphIndex: number) => {
    setSections(prev => {
      const section = prev[sectionIndex];
      const paragraphs = parseHtmlToParagraphs(section.content);
      if (paragraphIndex <= 0 || paragraphIndex >= paragraphs.length) return prev;

      const beforeContent = paragraphs.slice(0, paragraphIndex).map(p => `<p>${p}</p>`).join("");
      const rawTitle = paragraphs[paragraphIndex].replace(/<[^>]*>/g, "");
      const tempEl = document.createElement("span");
      tempEl.innerHTML = rawTitle;
      const newTitle = (tempEl.textContent || rawTitle).trim();
      const afterContent = paragraphs.slice(paragraphIndex + 1).map(p => `<p>${p}</p>`).join("");

      const updated = [...prev];
      updated[sectionIndex] = { ...updated[sectionIndex], content: beforeContent };
      updated.splice(sectionIndex + 1, 0, { title: newTitle, content: afterContent });
      return updated;
    });
    setCuttingIndex(null);
  }, []);

  // ── Resolve final metadata values ─────────────────────
  const resolvedMeta = useMemo(() => ({
    categoryId: showNewCat && newCategory.trim() ? newCategory.trim() : categoryId,
    subcategoryId: showNewSub && newSubcategory.trim() ? newSubcategory.trim() : subcategoryId,
    chapterId: showNewChapter && newChapter.trim() ? newChapter.trim() : chapterId,
  }), [showNewCat, newCategory, categoryId, showNewSub, newSubcategory, subcategoryId, showNewChapter, newChapter, chapterId]);

  // ── Submit ────────────────────────────────────────────
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const errors = validate(cardType, question, flashAnswer, sections);
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      toast.error(firstError);
      return;
    }

    setIsSaving(true);
    const { categoryId: cat, subcategoryId: sub, chapterId: ch } = resolvedMeta;

    try {
      if (cardType === "flash") {
        if (editCard && onUpdate) {
          onUpdate(editCard.id, {
            question,
            sections: [{ title: "Odgovor", content: flashAnswer }],
            categoryId: cat, subcategoryId: sub, chapterId: ch,
            ...(frequencyTag ? { frequencyTag: frequencyTag as FrequencyTag } : {}),
            ...(sourceType ? { sourceType: sourceType as CardSourceType } : {}),
          });
        } else {
          onSaveFlash(question, flashAnswer, cat, sub);
        }
      } else {
        if (editCard && onUpdate) {
          onUpdate(editCard.id, {
            question, sections, categoryId: cat, subcategoryId: sub, chapterId: ch,
            ...(frequencyTag ? { frequencyTag: frequencyTag as FrequencyTag } : {}),
            ...(sourceType ? { sourceType: sourceType as CardSourceType } : {}),
          });
        } else {
          onSave(question, sections, cat, sub, ch);
        }
      }
    } finally {
      setIsSaving(false);
    }
  }, [cardType, question, flashAnswer, sections, resolvedMeta, editCard, onSave, onSaveFlash, onUpdate]);

  return {
    // State
    cardType, question, flashAnswer, sections,
    categoryId, subcategoryId, chapterId,
    newCategory, showNewCat, newSubcategory, showNewSub,
    newChapter, showNewChapter,
    formWidth, cuttingIndex,
    availableChapters, availableSubs,
    linkedGazetteInfo,
    validationErrors, isSaving,
    frequencyTag, sourceType,
    // Setters
    setCardType, setQuestion, setFlashAnswer,
    setCategoryId, setSubcategoryId, setChapterId,
    setNewCategory, setShowNewCat,
    setNewSubcategory, setShowNewSub,
    setNewChapter, setShowNewChapter,
    setFormWidth, setCuttingIndex,
    setFrequencyTag, setSourceType,
    // Actions
    addSection, removeSection, updateSection, moveSection, handleCut, handleSubmit,
  };
}
