import { useState } from "react";
import { useCards } from "@/hooks/useCards";
import Dashboard from "@/components/Dashboard";
import CardForm from "@/components/CardForm";
import CardList from "@/components/CardList";
import ReviewSession from "@/components/ReviewSession";
import { Card } from "@/lib/spaced-repetition";
import { Plus, BookOpen, Home, FolderOpen, Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type View = "dashboard" | "create" | "edit" | "cards" | "review";

const Index = () => {
  const { cards, categories, dueCards, stats, addCard, updateCard, deleteCard, reviewCard, addCategory } = useCards();
  const [view, setView] = useState<View>("dashboard");
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
    setDark((d) => !d);
  };

  const handleEdit = (card: Card) => {
    setEditingCard(card);
    setView("edit");
  };

  const navItems = [
    { key: "dashboard" as View, icon: Home, label: "Početna" },
    { key: "cards" as View, icon: BookOpen, label: "Kartice" },
    { key: "create" as View, icon: Plus, label: "Nova" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-serif italic tracking-tight text-primary">Memoria</h1>
          <nav className="hidden md:flex gap-1">
            {navItems.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                  view === key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
        <button onClick={toggleDark} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {view === "dashboard" && (
            <motion.div key="dash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Dashboard stats={stats} onStartReview={() => setView("review")} />
            </motion.div>
          )}

          {view === "review" && (
            <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ReviewSession dueCards={dueCards} onReview={reviewCard} onBack={() => setView("dashboard")} />
            </motion.div>
          )}

          {(view === "create" || view === "edit") && (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CardForm
                categories={categories}
                onSave={(q, a, c) => { addCard(q, a, c); setView("cards"); }}
                onCancel={() => { setView("dashboard"); setEditingCard(null); }}
                editCard={view === "edit" ? editingCard : null}
                onUpdate={(id, u) => { updateCard(id, u); setView("cards"); setEditingCard(null); }}
              />
            </motion.div>
          )}

          {view === "cards" && (
            <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-serif">Kartice</h2>
                  <button
                    onClick={() => setView("create")}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity"
                  >
                    <Plus className="h-4 w-4" /> Nova
                  </button>
                </div>

                {/* Category filter */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setFilterCategory(null)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      !filterCategory ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    Sve
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => setFilterCategory(c)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        filterCategory === c ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <CardList cards={cards} filterCategory={filterCategory} onEdit={handleEdit} onDelete={deleteCard} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile nav */}
      <nav className="md:hidden border-t flex justify-around py-3 bg-background">
        {navItems.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`flex flex-col items-center gap-1 text-xs transition-colors ${
              view === key ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Index;
