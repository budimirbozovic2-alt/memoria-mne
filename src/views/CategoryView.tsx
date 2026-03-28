import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { db, type CategoryRecord, type Source } from "@/lib/db";
import type { Card } from "@/lib/spaced-repetition";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FileText, Brain } from "lucide-react";

export default function CategoryView() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [category, setCategory] = useState<CategoryRecord | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categoryId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [cat, catCards, catSources] = await Promise.all([
          db.categories.get(categoryId),
          db.cards.where("categoryId").equals(categoryId).toArray(),
          db.sources.where("categoryId").equals(categoryId).toArray(),
        ]);
        if (cancelled) return;
        setCategory(cat ?? null);
        setCards(catCards);
        setSources(catSources);
      } catch (e) {
        console.error("[CategoryView] load error", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [categoryId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Kategorija nije pronađena.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {category.color && (
          <span
            className="h-4 w-4 rounded-full shrink-0"
            style={{ backgroundColor: category.color }}
          />
        )}
        <h1 className="text-2xl font-bold text-foreground">{category.name}</h1>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="cards" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="cards" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Kartice
            <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5">
              {cards.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="sources" className="gap-2">
            <FileText className="h-4 w-4" />
            Izvori
            <Badge variant="secondary" className="ml-1 text-[10px] h-5 px-1.5">
              {sources.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="mnemonic" className="gap-2">
            <Brain className="h-4 w-4" />
            Mnemonička radionica
          </TabsTrigger>
        </TabsList>

        {/* Cards Tab */}
        <TabsContent value="cards">
          {cards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nema kartica u ovoj kategoriji.
            </div>
          ) : (
            <div className="space-y-2">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm text-foreground truncate">
                      {card.question || "(Bez pitanja)"}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {card.type === "flash" ? "Flash" : "Esej"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Sources Tab */}
        <TabsContent value="sources">
          {sources.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nema izvora u ovoj kategoriji.
            </div>
          ) : (
            <div className="space-y-2">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
                >
                  <span className="text-sm text-foreground truncate">
                    {source.title}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {source.date}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Mnemonic Workshop Tab */}
        <TabsContent value="mnemonic">
          <div className="text-center py-12 space-y-2">
            <Brain className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Mnemonička radionica za kategoriju:{" "}
              <strong className="text-foreground">{category.name}</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              Scoped categoryId: <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">{categoryId}</code>
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
