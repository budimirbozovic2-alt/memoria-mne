import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { Card, createCard, createFlashCard, createSection, calculateNextReview, getDueCards, getStats, getCategoryStats, SRSettings, DEFAULT_SR_SETTINGS, ErrorLogEntry } from "@/lib/spaced-repetition";
import { ReviewLogEntry, setLastBackupTime } from "@/lib/storage";
import {
  migrateFromLocalStorage,
  idbLoadCards, idbSaveCards,
  idbLoadCategories, idbSaveCategories,
  idbLoadSubcategories, idbSaveSubcategories,
  idbLoadReviewLog, idbAddReviewLogEntry,
  idbLoadSettings, idbSaveSettings,
} from "@/lib/db";

export function useCards() {
  const [cards, setCardsState] = useState<Card[]>([]);
  const [categories, setCategoriesState] = useState<string[]>(["Opšte"]);
  const [subcategories, setSubcategoriesState] = useState<Record<string, string[]>>({});
  const [reviewLog, setReviewLogState] = useState<ReviewLogEntry[]>([]);
  const [srSettings, setSrSettingsState] = useState<SRSettings>(DEFAULT_SR_SETTINGS);
  const [ready, setReady] = useState(false);
  const initialLoadDone = useRef(false);

  // ── Initial async load from IndexedDB ──
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    (async () => {
      await migrateFromLocalStorage();
      const [c, cats, subs, log, settings] = await Promise.all([
        idbLoadCards(),
        idbLoadCategories(),
        idbLoadSubcategories(),
        idbLoadReviewLog(),
        idbLoadSettings<SRSettings>("srSettings", DEFAULT_SR_SETTINGS),
      ]);
      setCardsState(c);
      setCategoriesState(cats);
      setSubcategoriesState(subs);
      setReviewLogState(log);
      setSrSettingsState(settings);
      setReady(true);
    })();
  }, []);

  // ── Helpers: update state + persist async ──
  const setCards = useCallback((updater: (prev: Card[]) => Card[]) => {
    setCardsState(prev => {
      const next = updater(prev);
      idbSaveCards(next); // fire-and-forget async persist
      return next;
    });
  }, []);

  const setCategories = useCallback((updater: (prev: string[]) => string[]) => {
    setCategoriesState(prev => {
      const next = updater(prev);
      idbSaveCategories(next);
      return next;
    });
  }, []);

  const setSubcategories = useCallback((updater: (prev: Record<string, string[]>) => Record<string, string[]>) => {
    setSubcategoriesState(prev => {
      const next = updater(prev);
      idbSaveSubcategories(next);
      return next;
    });
  }, []);

  const setReviewLog = useCallback((updater: (prev: ReviewLogEntry[]) => ReviewLogEntry[]) => {
    setReviewLogState(prev => updater(prev));
  }, []);

  // ── Actions ──
  const updateSRSettings = useCallback((settings: SRSettings) => {
    setSrSettingsState(settings);
    idbSaveSettings("srSettings", settings);
  }, []);

  const addCard = useCallback((question: string, sections: { title: string; content: string }[], category: string, subcategory?: string) => {
    const card = createCard(question, sections, category, subcategory);
    setCards(prev => [...prev, card]);
    if (!categories.includes(category)) {
      setCategories(prev => [...prev, category]);
    }
    return card;
  }, [categories, setCards, setCategories]);

  const addFlashCard = useCallback((question: string, answer: string, category: string, subcategory?: string) => {
    const card = createFlashCard(question, answer, category, subcategory);
    setCards(prev => [...prev, card]);
    if (!categories.includes(category)) {
      setCategories(prev => [...prev, category]);
    }
    return card;
  }, [categories, setCards, setCategories]);

  const updateCard = useCallback((id: string, updates: { question?: string; sections?: { title: string; content: string }[]; category?: string; subcategory?: string }) => {
    setCards(prev => prev.map(c => {
      if (c.id !== id) return c;
      const newCard = { ...c };
      if (updates.question) newCard.question = updates.question;
      if (updates.category) newCard.category = updates.category;
      if (updates.subcategory !== undefined) newCard.subcategory = updates.subcategory;
      if (updates.sections) {
        newCard.sections = updates.sections.map(s => {
          const existing = c.sections.find(es => es.title === s.title);
          if (existing) return { ...existing, content: s.content };
          return createSection(s.title, s.content);
        });
      }
      return newCard;
    }));
  }, [setCards]);

  const deleteCard = useCallback((id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
  }, [setCards]);

  const reviewSection = useCallback((cardId: string, sectionId: string, grade: number) => {
    setCards(prev =>
      prev.map(c => {
        if (c.id !== cardId) return c;
        const entry: ReviewLogEntry = { timestamp: Date.now(), cardId, sectionId, grade, category: c.category };
        idbAddReviewLogEntry(entry);
        setReviewLog(log => [...log, entry]);

        let errorLog = c.errorLog;
        if (errorLog && errorLog.length > 0 && grade >= 3) {
          errorLog = errorLog.map(e => ({ ...e, recentSuccesses: (e.recentSuccesses || 0) + 1, successStreak: (e.successStreak || 0) + 1 }));
        } else if (errorLog && errorLog.length > 0 && grade === 1) {
          errorLog = errorLog.map(e => ({ ...e, successStreak: 0 }));
        }

        return {
          ...c,
          ...(errorLog ? { errorLog } : {}),
          sections: c.sections.map(s => s.id !== sectionId ? s : { ...s, ...calculateNextReview(s, grade) }),
        };
      })
    );
  }, [setCards, setReviewLog]);

  const splitCard = useCallback((id: string) => {
    setCards(prev => {
      const card = prev.find(c => c.id === id);
      if (!card || card.sections.length <= 1) return prev;
      const newCards = card.sections.map(section =>
        ({ ...createCard(card.question, [{ title: section.title, content: section.content }], card.category, card.subcategory), sections: [{ ...section }] })
      );
      return [...prev.filter(c => c.id !== id), ...newCards];
    });
  }, [setCards]);

  const addCategory = useCallback((name: string) => {
    if (!categories.includes(name)) setCategories(prev => [...prev, name]);
  }, [categories, setCategories]);

  const renameCategory = useCallback((oldName: string, newName: string) => {
    if (categories.includes(newName)) return;
    setCategories(prev => prev.map(c => c === oldName ? newName : c));
    setCards(prev => prev.map(c => c.category === oldName ? { ...c, category: newName } : c));
    setSubcategories(prev => {
      const next = { ...prev };
      if (next[oldName]) { next[newName] = next[oldName]; delete next[oldName]; }
      return next;
    });
  }, [categories, setCategories, setCards, setSubcategories]);

  const deleteCategory = useCallback((name: string) => {
    setCategories(prev => prev.filter(c => c !== name));
    setCards(prev => prev.map(c => c.category === name ? { ...c, category: "Opšte", subcategory: "" } : c));
    setSubcategories(prev => { const next = { ...prev }; delete next[name]; return next; });
  }, [setCategories, setCards, setSubcategories]);

  const addSubcategory = useCallback((category: string, subcategory: string) => {
    setSubcategories(prev => {
      const list = prev[category] || [];
      if (list.includes(subcategory)) return prev;
      return { ...prev, [category]: [...list, subcategory] };
    });
  }, [setSubcategories]);

  const renameSubcategory = useCallback((category: string, oldName: string, newName: string) => {
    setSubcategories(prev => {
      const list = prev[category] || [];
      if (list.includes(newName)) return prev;
      return { ...prev, [category]: list.map(s => s === oldName ? newName : s) };
    });
    setCards(prev => prev.map(c => c.category === category && c.subcategory === oldName ? { ...c, subcategory: newName } : c));
  }, [setSubcategories, setCards]);

  const deleteSubcategory = useCallback((category: string, subcategory: string) => {
    setSubcategories(prev => ({ ...prev, [category]: (prev[category] || []).filter(s => s !== subcategory) }));
    setCards(prev => prev.map(c => c.category === category && c.subcategory === subcategory ? { ...c, subcategory: "" } : c));
  }, [setSubcategories, setCards]);

  const markRead = useCallback((id: string) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, readCount: (c.readCount || 0) + 1 } : c));
  }, [setCards]);

  const bulkUpdateSubcategory = useCallback((ids: string[], subcategory: string) => {
    setCards(prev => prev.map(c => ids.includes(c.id) ? { ...c, subcategory } : c));
  }, [setCards]);

  const toggleTag = useCallback((cardId: string, tag: string) => {
    setCards(prev => prev.map(c => {
      if (c.id !== cardId) return c;
      const tags = c.tags || [];
      return { ...c, tags: tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag] };
    }));
  }, [setCards]);

  const logError = useCallback((cardId: string, text: string) => {
    setCards(prev => prev.map(c => {
      if (c.id !== cardId) return c;
      const errorLog = [...(c.errorLog || [])];
      const existing = errorLog.find(e => e.text === text);
      if (existing) {
        existing.count += 1;
        existing.lastMissed = new Date().toISOString();
        existing.successStreak = 0;
      } else {
        errorLog.push({ text, count: 1, recentSuccesses: 0, successStreak: 0, category: c.category, lastMissed: new Date().toISOString() });
      }
      const sections = c.sections.map(s => ({ ...s, difficulty: Math.min(10, s.difficulty + 0.5), stability: Math.max(0.1, s.stability * 0.85) }));
      return { ...c, errorLog, sections };
    }));
  }, [setCards]);

  const clearErrorLog = useCallback((cardId: string) => {
    setCards(prev => prev.map(c => c.id !== cardId ? c : { ...c, errorLog: [] }));
  }, [setCards]);

  const downloadJson = useCallback((data: object, filename: string) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }, []);

  const exportTemplate = useCallback(() => {
    const templateCards = cards.map(c => ({
      id: c.id, question: c.question,
      sections: c.sections.map(s => ({ title: s.title, content: s.content })),
      category: c.category, subcategory: c.subcategory || "", type: c.type, tags: c.tags || [],
    }));
    downloadJson({ version: 2, type: "template", cards: templateCards, categories, subcategories },
      `memoria-template-${new Date().toISOString().slice(0, 10)}.json`);
  }, [cards, categories, subcategories, downloadJson]);

  const exportData = useCallback(() => {
    downloadJson({ version: 2, type: "full", cards, categories, subcategories, reviewLog, srSettings },
      `memoria-backup-${new Date().toISOString().slice(0, 10)}.json`);
    setLastBackupTime();
  }, [cards, categories, subcategories, reviewLog, srSettings, downloadJson]);

  const importData = useCallback((file: File, strategy: "keep" | "overwrite" | "skip" | "newer" = "skip") => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (Array.isArray(parsed.cards)) {
          const migrateImported = (c: any) => ({
            ...c, readCount: c.readCount || 0, type: c.type || "essay", subcategory: c.subcategory || "",
            tags: c.tags || [], errorLog: c.errorLog || [],
            sections: (c.sections || []).map((s: any) => ({
              ...s, id: s.id || crypto.randomUUID(), state: s.state ?? 0, lapses: s.lapses || 0,
              stability: s.stability ?? 0, difficulty: s.difficulty ?? 5, interval: s.interval ?? 0,
              nextReview: s.nextReview ?? 0, lastReviewed: s.lastReviewed ?? null,
              elapsedDays: s.elapsedDays ?? 0, scheduledDays: s.scheduledDays ?? 0,
            })),
          });

          const importedCards: Card[] = parsed.cards.map(migrateImported);
          setCards(prev => {
            const existingMap = new Map(prev.map(c => [c.id, c]));
            let merged: Card[];
            if (strategy === "newer") {
              const getLastReview = (c: Card) => Math.max(0, ...c.sections.map(s => s.lastReviewed || 0));
              merged = [...prev];
              importedCards.forEach(ic => {
                const existing = existingMap.get(ic.id);
                if (!existing) { merged.push(ic); }
                else if (getLastReview(ic) > getLastReview(existing)) {
                  merged = merged.map(c => c.id === ic.id ? ic : c);
                }
              });
            } else if (strategy === "overwrite") {
              const importedMap = new Map(importedCards.map(c => [c.id, c] as [string, Card]));
              merged = prev.map(c => importedMap.has(c.id) ? importedMap.get(c.id)! : c);
              importedCards.forEach(c => { if (!existingMap.has(c.id)) merged.push(c); });
            } else {
              merged = [...prev];
              importedCards.forEach(c => { if (!existingMap.has(c.id)) merged.push(c); });
            }
            return merged;
          });
        }
        if (Array.isArray(parsed.categories)) {
          setCategories(prev => [...new Set([...prev, ...parsed.categories])]);
        }
        if (parsed.subcategories && typeof parsed.subcategories === "object") {
          setSubcategories(prev => {
            const merged = { ...prev };
            for (const [cat, subs] of Object.entries(parsed.subcategories as Record<string, string[]>)) {
              merged[cat] = [...new Set([...(merged[cat] || []), ...subs])];
            }
            return merged;
          });
        }
        if (Array.isArray(parsed.reviewLog) && strategy === "overwrite") {
          setReviewLogState(parsed.reviewLog);
        }
        if (parsed.srSettings && strategy === "overwrite") {
          updateSRSettings({ ...DEFAULT_SR_SETTINGS, ...parsed.srSettings });
        }
      } catch {
        alert("Greška pri čitanju fajla. Provjerite format.");
      }
    };
    reader.readAsText(file);
  }, [setCards, setCategories, setSubcategories, updateSRSettings]);

  const importCards = useCallback((newCards: { question: string; sections: { title: string; content: string }[] }[], category: string) => {
    const created = newCards.map(c => createCard(c.question, c.sections, category));
    setCards(prev => [...prev, ...created]);
    if (!categories.includes(category)) setCategories(prev => [...prev, category]);
  }, [categories, setCards, setCategories]);

  // ── Derived data ──
  const cardCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    categories.forEach(cat => { counts[cat] = 0; });
    cards.forEach(c => { counts[c.category] = (counts[c.category] || 0) + 1; });
    return counts;
  }, [cards, categories]);

  const dueCards = getDueCards(cards);
  const stats = getStats(cards);
  const categoryStats = Object.fromEntries(categories.map(cat => [cat, getCategoryStats(cards, cat)]));

  return {
    cards, categories, subcategories, dueCards, stats, categoryStats, cardCountByCategory, reviewLog, srSettings, ready,
    addCard, addFlashCard, updateCard, deleteCard, splitCard, reviewSection, markRead, toggleTag, bulkUpdateSubcategory, logError, clearErrorLog,
    exportData, exportTemplate, importData, importCards,
    addCategory, renameCategory, deleteCategory,
    addSubcategory, renameSubcategory, deleteSubcategory,
    updateSRSettings,
  };
}
