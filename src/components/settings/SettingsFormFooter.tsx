import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsContext } from "@/components/settings/SettingsContext";

export default function SettingsFormFooter() {
  const { isSubjectMode, overridesEnabled, hasChanges, isDefault, handleSave, handleReset } =
    useSettingsContext();

  // Global mode auto-saves; offer only restore-to-defaults.
  if (!isSubjectMode) {
    return (
      <div className="flex items-center justify-between gap-3 pb-4">
        <p className="text-xs text-muted-foreground">Izmjene se čuvaju automatski.</p>
        <Button onClick={handleReset} variant="outline" disabled={isDefault} className="h-9">
          <RotateCcw className="h-4 w-4 mr-2" />
          Podrazumijevano
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-3 pb-4">
      <Button onClick={() => void handleSave()} disabled={!hasChanges} className="flex-1 h-9">
        Sačuvaj za predmet
      </Button>
      <Button
        onClick={handleReset}
        variant="outline"
        disabled={!overridesEnabled}
        className="h-9"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Globalne vrijednosti
      </Button>
    </div>
  );
}
