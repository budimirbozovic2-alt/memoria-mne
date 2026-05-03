import { useState, lazy, Suspense } from "react";
import { Plus, Pencil, Sparkles, FileText, Upload, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { AddCardDialog } from "./CardViewDialogs";
import MassFlashImportTrigger from "./MassFlashImportTrigger";
import type { Card } from "@/lib/spaced-repetition";

const DocxImporter = lazy(() => import("@/components/DocxImporter"));

interface ParsedEssay {
  question: string;
  sections: { title: string; content: string }[];
}

interface Props {
  categoryId: string;
  /** Names of all categories — fed to the DocxImporter category picker. */
  allCategoryNames: string[];
  addCard: (
    question: string,
    sections: { title: string; content: string }[],
    category: string,
    subcategory?: string,
    chapter?: string,
  ) => Card;
  addFlashCard: (
    question: string,
    answer: string,
    category: string,
    subcategory?: string,
  ) => Card;
  /** Bulk essay import (from useBackupActions().importCards). */
  importEssays: (cards: ParsedEssay[], category: string) => void;
}

/**
 * Single primary action for ALL card-creation flows.
 *
 * Renders a "Dodaj" dropdown with exactly four entries — two single-card
 * creators and two mass-import triggers. The filter/list area is intentionally
 * stripped of any creation logic; this menu is the only entry point.
 */
export default function CardCreateMenu({
  categoryId,
  allCategoryNames,
  addCard,
  addFlashCard,
  importEssays,
}: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<"essay" | "flash">("flash");
  const [docxOpen, setDocxOpen] = useState(false);
  const [bulkFlashOpen, setBulkFlashOpen] = useState(false);

  const openAdd = (mode: "essay" | "flash") => {
    setAddMode(mode);
    setAddOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="h-8 gap-1.5 text-xs" aria-label="Dodaj karticu">
            <Plus className="h-3.5 w-3.5" /> Dodaj
            <ChevronDown className="h-3 w-3 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Pojedinačno
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => openAdd("essay")} className="gap-2 text-xs">
            <Pencil className="h-3.5 w-3.5" />
            Dodaj esej
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openAdd("flash")} className="gap-2 text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            Dodaj blic pitanje
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Masovni uvoz
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setDocxOpen(true)} className="gap-2 text-xs">
            <FileText className="h-3.5 w-3.5" />
            Masovni uvoz eseja
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setBulkFlashOpen(true)} className="gap-2 text-xs">
            <Upload className="h-3.5 w-3.5" />
            Masovni uvoz blic pitanja
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddCardDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        categoryId={categoryId}
        addCard={addCard}
        addFlashCard={addFlashCard}
        defaultMode={addMode}
      />

      {docxOpen && (
        <Suspense fallback={null}>
          <DocxImporter
            open={docxOpen}
            onClose={() => setDocxOpen(false)}
            categories={allCategoryNames}
            onImport={(cards, cat, type) => {
              if (type === "flash") {
                cards.forEach((c) =>
                  addFlashCard(
                    c.question,
                    c.sections.map((s) => s.content).join("\n"),
                    cat,
                  ),
                );
              } else {
                importEssays(cards, cat);
              }
              setDocxOpen(false);
            }}
          />
        </Suspense>
      )}

      <MassFlashImportTrigger
        open={bulkFlashOpen}
        onOpenChange={setBulkFlashOpen}
        categoryId={categoryId}
        addFlashCard={addFlashCard}
      />
    </>
  );
}
