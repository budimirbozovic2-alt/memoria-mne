import { useState } from "react";
import { Card } from "@/lib/spaced-repetition";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";

interface Props {
  categories: string[];
  onSave: (question: string, answer: string, category: string) => void;
  onCancel: () => void;
  editCard?: Card | null;
  onUpdate?: (id: string, updates: Partial<Card>) => void;
}

export default function CardForm({ categories, onSave, onCancel, editCard, onUpdate }: Props) {
  const [question, setQuestion] = useState(editCard?.question ?? "");
  const [answer, setAnswer] = useState(editCard?.answer ?? "");
  const [category, setCategory] = useState(editCard?.category ?? categories[0] ?? "Opšte");
  const [newCategory, setNewCategory] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    const cat = showNewCat && newCategory.trim() ? newCategory.trim() : category;
    if (editCard && onUpdate) {
      onUpdate(editCard.id, { question, answer, category: cat });
    } else {
      onSave(question, answer, cat);
    }
    setQuestion("");
    setAnswer("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-serif">{editCard ? "Uredi karticu" : "Nova kartica"}</h2>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Pitanje</label>
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Unesite esejsko pitanje..."
          className="min-h-[100px] resize-y bg-card"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Odgovor</label>
        <Textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Unesite očekivani odgovor..."
          className="min-h-[160px] resize-y bg-card"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Kategorija</label>
        {!showNewCat ? (
          <div className="flex gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="icon" onClick={() => setShowNewCat(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Nova kategorija..."
              className="bg-card"
            />
            <Button type="button" variant="outline" size="icon" onClick={() => setShowNewCat(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <Button type="submit" className="w-full">
        {editCard ? "Sačuvaj izmjene" : "Dodaj karticu"}
      </Button>
    </form>
  );
}
