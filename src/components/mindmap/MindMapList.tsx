import { useState, useEffect } from "react";
import { MindMapDoc } from "@/lib/db";
import { loadMindMaps, deleteMindMap, saveMindMap } from "@/lib/mindmap-storage";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Network } from "lucide-react";
import { format } from "date-fns";

interface Props {
  onOpen: (doc: MindMapDoc) => void;
}

export default function MindMapList({ onOpen }: Props) {
  const [maps, setMaps] = useState<MindMapDoc[]>([]);

  const refresh = async () => setMaps(await loadMindMaps());

  useEffect(() => { refresh(); }, []);

  const createNew = async () => {
    const doc: MindMapDoc = {
      id: crypto.randomUUID(),
      title: "Nova mentalna mapa",
      nodes: [],
      edges: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveMindMap(doc);
    onOpen(doc);
  };

  const handleDelete = async (id: string) => {
    await deleteMindMap(id);
    refresh();
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" />
            Mentalne mape
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kreirajte vizuelne dijagrame za hijerarhije, tokove postupaka i organizacione strukture.
          </p>
        </div>
        <Button onClick={createNew}>
          <Plus className="h-4 w-4 mr-1" /> Nova mapa
        </Button>
      </div>

      {maps.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <Network className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground">Nemate nijednu mentalnu mapu.</p>
          <Button variant="outline" onClick={createNew}>
            <Plus className="h-4 w-4 mr-1" /> Kreiraj prvu mapu
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {maps.map(m => (
            <div
              key={m.id}
              onClick={() => onOpen(m)}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Network className="h-5 w-5 text-primary" />
                <div>
                  <span className="text-sm font-medium text-foreground">{m.title}</span>
                  <p className="text-xs text-muted-foreground">
                    {m.nodes.length} čvorova · Izmijenjeno {format(new Date(m.updatedAt), "dd.MM.yyyy HH:mm")}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
