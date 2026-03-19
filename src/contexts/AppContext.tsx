import { createContext, useContext, useCallback, useMemo, useState, useEffect, ReactNode } from "react";
import { useCards } from "@/hooks/useCards";
import { Card } from "@/lib/spaced-repetition";
import { createMnemonicCard, loadMnemonicCards, saveMnemonicCards } from "@/lib/mnemonic-storage";
import { recordAppEntry, recordFirstAction, addActivityEntry, ActivityType } from "@/lib/metacognitive-storage";

// ─── Types ──────────────────────────────────────────────
export type View = "dashboard" | "create" | "edit" | "cards" | "review" | "categories" | "learn" | "settings" | "frequent-errors" | "knowledge-map" | "mnemonic" | "major-system-settings" | "metacognitive" | "stats" | "planner";

const VIEW_ACTIVITY_MAP: Partial<Record<View, ActivityType>> = {
  review: "review",
  learn: "learn-active",
  mnemonic: "mnemonic-workshop",
  create: "admin",
  edit: "admin",
  categories: "admin",
  stats: "analysis",
  metacognitive: "analysis",
  planner: "analysis",
};

interface AppContextValue {
  // useCards data
  cards: Card[];
  categories: string[];
  subcategories: Record<string, string[]>;
  dueCards: Card[];
  stats: { due: number; total: number; totalSections: number; learnedSections: number };
  categoryStats: Record<string, { score: number; total: number; due: number }>;
  cardCountByCategory: Record<string, number>;
  reviewLog: any[];
  srSettings: any;
  // useCards actions
  addCard: (...args: any[]) => any;
  addFlashCard: (...args: any[]) => any;
  updateCard: (...args: any[]) => void;
  deleteCard: (id: string) => void;
  splitCard: (id: string) => void;
  reviewSection: (cardId: string, sectionId: string, grade: number) => void;
  markRead: (id: string) => void;
  toggleTag: (cardId: string, tag: string) => void;
  bulkUpdateSubcategory: (ids: string[], sub: string) => void;
  logError: (cardId: string, text: string) => void;
  clearErrorLog: (cardId: string) => void;
  exportData: () => void;
  exportTemplate: () => void;
  importData: (file: File, strategy?: any) => void;
  importCards: (cards: any[], cat: string) => void;
  addCategory: (name: string) => void;
  renameCategory: (old: string, next: string) => void;
  deleteCategory: (name: string) => void;
  addSubcategory: (cat: string, sub: string) => void;
  renameSubcategory: (cat: string, old: string, next: string) => void;
  deleteSubcategory: (cat: string, sub: string) => void;
  updateSRSettings: (s: any) => void;
  // Navigation
  view: View;
  setView: (v: View) => void;
  // Editing
  editingCard: Card | null;
  setEditingCard: (c: Card | null) => void;
  // Helpers
  handleToggleTag: (cardId: string, tag: string) => void;
  handleSendToWorkshop: (cardId: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const cardsHook = useCards();
  const { cards, toggleTag } = cardsHook;

  const [view, setViewRaw] = useState<View>("dashboard");
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  // Record app entry on mount
  useEffect(() => { recordAppEntry(); }, []);

  // Track first learning action
  useEffect(() => {
    if (view === "review" || view === "learn") recordFirstAction();
  }, [view]);

  // Auto time tracking per view
  useEffect(() => {
    const actType = VIEW_ACTIVITY_MAP[view];
    if (!actType) return;
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      if (duration > 5000) {
        addActivityEntry({ timestamp: start, type: actType, durationMs: duration });
      }
    };
  }, [view]);

  const setView = useCallback((v: View) => {
    setViewRaw(v);
  }, []);

  // Mnemonic cloning
  const handleToggleTag = useCallback((cardId: string, tag: string) => {
    toggleTag(cardId, tag);
    if (tag === "memorizacija") {
      const card = cards.find(c => c.id === cardId);
      if (card && !(card.tags || []).includes("memorizacija")) {
        const mnemonicCards = loadMnemonicCards();
        const alreadyCloned = mnemonicCards.some(mc => mc.originalCardId === cardId);
        if (!alreadyCloned) {
          const clone = createMnemonicCard(
            cardId, card.question,
            card.sections.map(s => ({ title: s.title, content: s.content })),
            card.category, card.subcategory,
            (card.tags || []).filter(t => t !== "memorizacija"),
          );
          saveMnemonicCards([...mnemonicCards, clone]);
        }
      } else if (card && (card.tags || []).includes("memorizacija")) {
        const mnemonicCards = loadMnemonicCards();
        saveMnemonicCards(mnemonicCards.filter(mc => mc.originalCardId !== cardId));
      }
    }
  }, [toggleTag, cards]);

  const handleSendToWorkshop = useCallback((cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    if (!(card.tags || []).includes("memorizacija")) {
      toggleTag(cardId, "memorizacija");
      const mnemonicCards = loadMnemonicCards();
      const alreadyCloned = mnemonicCards.some(mc => mc.originalCardId === cardId);
      if (!alreadyCloned) {
        const clone = createMnemonicCard(
          cardId, card.question,
          card.sections.map(s => ({ title: s.title, content: s.content })),
          card.category, card.subcategory,
          (card.tags || []).filter(t => t !== "memorizacija"),
        );
        saveMnemonicCards([...mnemonicCards, clone]);
      }
    }
    setView("mnemonic");
  }, [cards, toggleTag, setView]);

  const value = useMemo<AppContextValue>(() => ({
    ...cardsHook,
    view,
    setView,
    editingCard,
    setEditingCard,
    handleToggleTag,
    handleSendToWorkshop,
  }), [cardsHook, view, setView, editingCard, handleToggleTag, handleSendToWorkshop]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
