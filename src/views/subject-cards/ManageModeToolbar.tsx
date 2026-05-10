import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MANAGE_MODES, MANAGE_MODE, type ManageMode } from "@/views/subject-cards/manageModes";

interface ManageModeToolbarProps {
  manageMode: ManageMode;
  onChangeMode: (m: ManageMode) => void;
  onOpenStructure: () => void;
}

export default function ManageModeToolbar({ manageMode, onChangeMode, onOpenStructure }: ManageModeToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="inline-flex rounded-lg border bg-card p-0.5">
        {MANAGE_MODES.map((mode) => {
          const Icon = mode.icon;
          const active = manageMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onChangeMode(mode.id)}
              title={mode.tooltip}
              aria-label={mode.tooltip}
              aria-pressed={active}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {mode.label}
              <span className="opacity-60">({mode.shortTag})</span>
            </button>
          );
        })}
      </div>

      {manageMode === MANAGE_MODE.Structure && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 text-xs"
          onClick={onOpenStructure}
        >
          <Settings className="h-3.5 w-3.5" />
          Uredi potkategorije i glave
        </Button>
      )}
    </div>
  );
}
