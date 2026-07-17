import { Scale, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LinkedProvision } from "@/lib/db-types";
import type { Source } from "@/domains/sources/sources-storage";

interface Props {
  linkedProvisions: LinkedProvision[];
  sources: Source[];
  /** Open the linked source in the reading side panel (manual comparison — no auto-scroll). */
  onOpenSource: (sourceId: string) => void;
  /** Detach a single provision reference from this article. */
  onUnlink: (provisionId: string) => void;
}

/**
 * "Propisi povezani sa ovim člankom" — reference-only links to propis
 * excerpts (see `LinkedProvision`). Mirrors `LinkedCardsPanel`'s shape, but
 * has no "add" picker here: linking always starts from the Source Reader
 * selection (`SourceBubbleMenu` → "Poveži sa postojećim člankom"), since a
 * meaningful reference needs an actual selected excerpt to anchor to.
 */
function LinkedProvisionsPanel({ linkedProvisions, sources, onOpenSource, onUnlink }: Props) {
  return (
    <div className="rounded-lg border border-hairline bg-card/40">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-hairline">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Scale className="h-3.5 w-3.5 text-primary" />
          Propisi povezani sa ovim člankom
          {linkedProvisions.length > 0 && (
            <span className="rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">
              {linkedProvisions.length}
            </span>
          )}
        </div>
      </div>

      {linkedProvisions.length === 0 ? (
        <p className="px-3 py-3 text-xs text-muted-foreground">
          Nijedan propis još nije povezan sa ovim člankom. Označite tekst u
          izvoru i izaberite "Poveži sa postojećim člankom" da dodate vezu.
        </p>
      ) : (
        <ul className="divide-y divide-hairline">
          {linkedProvisions.map((provision) => {
            const source = sources.find((s) => s.id === provision.sourceId);
            return (
              <li key={provision.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <button
                  type="button"
                  onClick={() => onOpenSource(provision.sourceId)}
                  className="flex-1 min-w-0 text-left hover:text-primary transition-colors"
                  title="Otvori izvor"
                >
                  <span className="line-clamp-1">{provision.label}</span>
                  {source && (
                    <span className="block text-[10px] text-muted-foreground line-clamp-1">
                      {source.title}
                    </span>
                  )}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onUnlink(provision.id)}
                  title="Ukloni vezu"
                >
                  <Unlink className="h-3.5 w-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default LinkedProvisionsPanel;
