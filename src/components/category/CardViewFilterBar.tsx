import { Filter, X, CheckSquare } from "lucide-react";
import { MASTERY_LEVELS } from "@/lib/mastery";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FREQUENCY_TAGS } from "@/lib/sr/format";
import { cn } from "@/lib/utils";

export type FrequencyFilterValue = "all" | "često" | "rijetko" | "nikad" | "none";

/**
 * Filter/list-only surface for the "Pregled i uređivanje kartica" view.
 *
 * IMPORTANT — Separation of Concerns:
 *   This bar is strictly limited to filtering and selecting EXISTING cards.
 *   Creation flows (single add, bulk import) are intentionally NOT exposed
 *   here — they live in the dedicated `CardCreateMenu` ("Dodaj") dropdown
 *   alongside the Edit/Structure segmented switch in `SubjectCardsView`.
 */
interface Props {
  filterType: "all" | "essay" | "flash" | "mnemonic";
  onChangeType: (v: "all" | "essay" | "flash" | "mnemonic") => void;
  filterFrequency: FrequencyFilterValue;
  onChangeFrequency: (v: FrequencyFilterValue) => void;
  masteryFilter?: number | null;
  onClearMasteryFilter?: () => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  filteredCount: number;
  totalCount: number;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  onDelete?: (id: string) => void;
}

export default function CardViewFilterBar({
  filterType, onChangeType,
  filterFrequency, onChangeFrequency,
  masteryFilter, onClearMasteryFilter,
  hasActiveFilters, onResetFilters,
  filteredCount, totalCount,
  selectionMode, onToggleSelectionMode, onDelete,
}: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap rounded-lg border bg-card p-2.5">
      <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

      <div className="flex items-center gap-0.5 rounded-md border p-0.5">
        {(["all", "essay", "flash", "mnemonic"] as const).map(t => (
          <button
            key={t}
            onClick={() => onChangeType(t)}
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
              filterType === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "all" ? "Sve" : t === "essay" ? "Esej" : t === "flash" ? "Blic" : "Mnemo"}
          </button>
        ))}
      </div>

      <Select value={filterFrequency} onValueChange={(v) => onChangeFrequency(v as FrequencyFilterValue)}>
        <SelectTrigger className="h-7 w-auto min-w-[130px] text-xs">
          <SelectValue placeholder="Frekventnost" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">Sve frekventnosti</SelectItem>
          {FREQUENCY_TAGS.map(tag => (
            <SelectItem key={tag.value} value={tag.value} className="text-xs">{tag.label}</SelectItem>
          ))}
          <SelectItem value="none" className="text-xs">Bez oznake</SelectItem>
        </SelectContent>
      </Select>

      {masteryFilter !== null && masteryFilter !== undefined && (
        <button
          onClick={onClearMasteryFilter}
          className="flex items-center gap-1.5 h-7 px-2 rounded-md border text-[10px] font-medium hover:bg-secondary transition-colors"
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: MASTERY_LEVELS[masteryFilter].color }} />
          {MASTERY_LEVELS[masteryFilter].label}
          <X className="h-3 w-3" />
        </button>
      )}

      <div className="flex items-center gap-2 ml-auto">
        <span className="text-[10px] text-muted-foreground">{filteredCount}/{totalCount}</span>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onResetFilters} className="h-6 px-2 text-[10px] gap-1">
            <X className="h-3 w-3" /> Reset
          </Button>
        )}
        {onDelete && (
          <Button
            variant={selectionMode ? "secondary" : "outline"}
            size="sm"
            onClick={onToggleSelectionMode}
            className="h-7 gap-1.5 text-xs"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            {selectionMode ? "Otkaži" : "Izaberi"}
          </Button>
        )}
      </div>
    </div>
  );
}
