import { Link } from "react-router-dom";
import { ArrowLeft, Layers, Pencil, Sparkles, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SubjectHeaderProps {
  categoryId: string;
  categoryName: string;
  essayCount: number;
  flashCount: number;
  tab: "manage" | "read" | "speed";
  onBackToManage: () => void;
  createMenuSlot?: React.ReactNode;
}

export default function SubjectHeader({
  categoryId,
  categoryName,
  essayCount,
  flashCount,
  tab,
  onBackToManage,
  createMenuSlot,
}: SubjectHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <Link
        to={`/subject/${categoryId}`}
        className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Nazad na predmet"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <Layers className="h-5 w-5 text-primary shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground truncate">{categoryName}</h1>
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1" title="Esejska pitanja">
              <Pencil className="h-3 w-3" /> Esej: {essayCount}
            </Badge>
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1" title="Blic pitanja">
              <Sparkles className="h-3 w-3" /> Blic: {flashCount}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kartice — uređivanje, struktura, pasivno i brzo čitanje
          </p>
        </div>
      </div>
      {createMenuSlot}
      <Button
        asChild
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
        title="Memorizacija"
        aria-label="Memorizacija"
      >
        <Link to={`/subject/${categoryId}/mnemonics`}>
          <Brain className="h-4 w-4" />
        </Link>
      </Button>
      {(tab === "read" || tab === "speed") && (
        <Button variant="outline" size="sm" onClick={onBackToManage} className="gap-1.5 h-8 text-xs">
          <Pencil className="h-3.5 w-3.5" /> Nazad na uređivanje
        </Button>
      )}
    </div>
  );
}
