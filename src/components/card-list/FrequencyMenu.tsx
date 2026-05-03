import { Flame } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Card } from "@/lib/spaced-repetition";
import type { FrequencyTag } from "@/lib/sr/types";
import { FREQUENCY_VALUES, getFrequencyMeta } from "@/lib/sr/frequency";
import { cn } from "@/lib/utils";

interface Props {
  card: Card;
  setFrequency: (cardId: string, value: FrequencyTag | null) => void;
  /** Compact icon-only trigger (used in dense rows). */
  size?: "sm" | "md";
}

/**
 * Triple-state frequency control. Replaces the legacy binary
 * "Često na ispitu" Flame toggle. Writes to `Card.frequencyTag`
 * (single source of truth) and lazy-cleans legacy `tags[]` strings.
 */
export default function FrequencyMenu({ card, setFrequency, size = "md" }: Props) {
  const current = card.frequencyTag;
  const meta = getFrequencyMeta(current);
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const buttonSize = size === "sm" ? "p-1.5" : "p-2";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            buttonSize,
            "rounded-lg transition-colors hover:bg-secondary",
            meta.iconClass,
          )}
          title={current ? `Frekventnost: ${meta.label}` : "Postavi frekventnost"}
          aria-label="Frekventnost na ispitu"
        >
          <Flame className={iconSize} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {FREQUENCY_VALUES.map((v) => {
          const m = getFrequencyMeta(v);
          const active = current === v;
          return (
            <DropdownMenuItem
              key={v}
              onClick={(e) => { e.stopPropagation(); setFrequency(card.id, v); }}
              className={cn("gap-2 text-xs", active && "bg-accent")}
            >
              <Flame className={cn("h-3.5 w-3.5", m.iconClass)} />
              <span className="flex-1">{m.label}</span>
              {active && <span className="text-[10px] text-muted-foreground">✓</span>}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!current}
          onClick={(e) => { e.stopPropagation(); setFrequency(card.id, null); }}
          className="text-xs text-muted-foreground"
        >
          Ukloni oznaku
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
