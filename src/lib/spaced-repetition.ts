// SM-2 Algorithm implementation

export interface Card {
  id: string;
  question: string;
  answer: string;
  category: string;
  easeFactor: number;
  interval: number; // days
  repetitions: number;
  nextReview: number; // timestamp
  createdAt: number;
  lastReviewed: number | null;
}

export interface ReviewGrade {
  label: string;
  value: number;
  description: string;
  color: string;
}

export const GRADES: ReviewGrade[] = [
  { label: "Ponovi", value: 0, description: "Potpuno zaboravljeno", color: "destructive" },
  { label: "Teško", value: 3, description: "Značajan napor pri prisjećanju", color: "warning" },
  { label: "Dobro", value: 4, description: "Prisjećanje uz mali napor", color: "primary" },
  { label: "Lako", value: 5, description: "Savršeno prisjećanje", color: "success" },
];

export function calculateNextReview(card: Card, grade: number): Partial<Card> {
  let { easeFactor, interval, repetitions } = card;

  if (grade < 3) {
    // Reset
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  );

  const nextReview = Date.now() + interval * 24 * 60 * 60 * 1000;

  return {
    easeFactor,
    interval,
    repetitions,
    nextReview,
    lastReviewed: Date.now(),
  };
}

export function createCard(question: string, answer: string, category: string): Card {
  return {
    id: crypto.randomUUID(),
    question,
    answer,
    category,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: Date.now(),
    createdAt: Date.now(),
    lastReviewed: null,
  };
}

export function getDueCards(cards: Card[]): Card[] {
  const now = Date.now();
  return cards
    .filter((c) => c.nextReview <= now)
    .sort((a, b) => a.nextReview - b.nextReview);
}

export function getStats(cards: Card[]) {
  const now = Date.now();
  const due = cards.filter((c) => c.nextReview <= now).length;
  const learned = cards.filter((c) => c.repetitions > 0).length;
  const total = cards.length;
  return { due, learned, total, newCards: total - learned };
}
