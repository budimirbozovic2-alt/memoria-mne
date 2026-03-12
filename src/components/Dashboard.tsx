import { Card } from "@/lib/spaced-repetition";
import { BookOpen, Brain, Clock, Layers } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  stats: { due: number; learned: number; total: number; newCards: number };
  onStartReview: () => void;
}

const statCards = [
  { key: "due", label: "Za ponavljanje", icon: Clock, accent: "text-primary" },
  { key: "learned", label: "Naučeno", icon: Brain, accent: "text-success" },
  { key: "newCards", label: "Novo", icon: BookOpen, accent: "text-warning" },
  { key: "total", label: "Ukupno", icon: Layers, accent: "text-muted-foreground" },
] as const;

export default function Dashboard({ stats, onStartReview }: Props) {
  return (
    <div className="space-y-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-5xl md:text-6xl font-serif italic tracking-tight">
          Učenje kroz<br />
          <span className="text-primary">ponavljanje</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-md">
          Esejska pitanja sa spaced repetition algoritmom za duboko razumijevanje.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ key, label, icon: Icon, accent }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="rounded-xl bg-card border p-5"
          >
            <Icon className={`h-5 w-5 ${accent} mb-3`} />
            <p className="text-3xl font-serif">{stats[key]}</p>
            <p className="text-sm text-muted-foreground mt-1">{label}</p>
          </motion.div>
        ))}
      </div>

      {stats.due > 0 && (
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          onClick={onStartReview}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl text-lg font-medium hover:opacity-90 transition-opacity"
        >
          <Brain className="h-5 w-5" />
          Ponavljaj ({stats.due})
        </motion.button>
      )}
    </div>
  );
}
