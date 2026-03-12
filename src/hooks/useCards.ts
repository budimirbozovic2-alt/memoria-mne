import { useState, useCallback, useEffect } from "react";
import { Card, createCard, calculateNextReview, getDueCards, getStats } from "@/lib/spaced-repetition";
import { loadCards, saveCards, loadCategories, saveCategories } from "@/lib/storage";

export function useCards() {
  const [cards, setCards] = useState<Card[]>(() => loadCards());
  const [categories, setCategories] = useState<string[]>(() => loadCategories());

  useEffect(() => { saveCards(cards); }, [cards]);
  useEffect(() => { saveCategories(categories); }, [categories]);

  const addCard = useCallback((question: string, answer: string, category: string) => {
    const card = createCard(question, answer, category);
    setCards((prev) => [...prev, card]);
    if (!categories.includes(category)) {
      setCategories((prev) => [...prev, category]);
    }
    return card;
  }, [categories]);

  const updateCard = useCallback((id: string, updates: Partial<Card>) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const deleteCard = useCallback((id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const reviewCard = useCallback((id: string, grade: number) => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updates = calculateNextReview(c, grade);
        return { ...c, ...updates };
      })
    );
  }, []);

  const addCategory = useCallback((name: string) => {
    if (!categories.includes(name)) {
      setCategories((prev) => [...prev, name]);
    }
  }, [categories]);

  const deleteCategory = useCallback((name: string) => {
    setCategories((prev) => prev.filter((c) => c !== name));
    setCards((prev) => prev.map((c) => (c.category === name ? { ...c, category: "Opšte" } : c)));
  }, []);

  const dueCards = getDueCards(cards);
  const stats = getStats(cards);

  return {
    cards, categories, dueCards, stats,
    addCard, updateCard, deleteCard, reviewCard,
    addCategory, deleteCategory,
  };
}
