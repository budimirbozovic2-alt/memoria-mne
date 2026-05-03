import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { parseFlashcards, type ParsedFlashcard } from "@/lib/flashcard-parser";

/**
 * Stand-alone reference panel for the P:/O: mass-import flow.
 *
 * Designed to be drop-in for the upcoming Wizard step: it owns ONLY the
 * textarea + parse-and-emit cycle. No persistence, no dialog chrome.
 */
interface Props {
  onImport: (cards: ParsedFlashcard[]) => void;
}

export default function FlashcardImportPanel({ onImport }: Props) {
  const [raw, setRaw] = useState("");

  const handleImport = () => {
    const parsed = parseFlashcards(raw);
    if (parsed.length === 0) return;
    onImport(parsed);
    setRaw("");
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Format: redovi koji počinju sa <code className="bg-muted px-1 rounded">P:</code>{" "}
        (pitanje) i <code className="bg-muted px-1 rounded">O:</code> (odgovor).
        Odgovor može imati više pasusa.
      </p>
      <Textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={12}
        placeholder={
          "P: Šta je ugovor?\nO: Saglasnost volja dviju strana o nastanku, izmjeni ili prestanku obligacionog odnosa.\n\nP: Šta je hipoteka?\nO: Založno pravo na nekretnini."
        }
        className="font-mono text-xs"
      />
      <Button
        onClick={handleImport}
        disabled={!raw.trim()}
        className="w-full gap-2"
      >
        <Upload className="h-4 w-4" /> Uvezi
      </Button>
    </div>
  );
}
