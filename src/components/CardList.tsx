import { Card } from "@/lib/spaced-repetition";
import { format } from "date-fns";
import { Edit2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  cards: Card[];
  filterCategory: string | null;
  onEdit: (card: Card) => void;
  onDelete: (id: string) => void;
}

export default function CardList({ cards, filterCategory, onEdit, onDelete }: Props) {
  const filtered = filterCategory ? cards.filter((c) => c.category === filterCategory) : cards;

  if (filtered.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-12">
        Nema kartica. Kreirajte prvu!
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((card, i) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="group rounded-xl bg-card border p-5 hover:border-primary/30 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">{card.category}</span>
              <p className="mt-1 font-serif text-lg line-clamp-2">{card.question}</p>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{card.answer}</p>
              <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <span>Sljedeće: {format(new Date(card.nextReview), "dd.MM.yyyy")}</span>
                <span>Interval: {card.interval}d</span>
                <span>EF: {card.easeFactor.toFixed(1)}</span>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(card)} className="p-2 hover:bg-secondary rounded-lg">
                <Edit2 className="h-4 w-4 text-muted-foreground" />
              </button>
              <button onClick={() => onDelete(card.id)} className="p-2 hover:bg-destructive/10 rounded-lg">
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
