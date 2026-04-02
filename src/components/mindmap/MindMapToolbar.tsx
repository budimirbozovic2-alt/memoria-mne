import { Plus, Save, ArrowLeft, GitBranch, Workflow, ChevronDown, LayoutGrid, Eye, EyeOff, FolderDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ICON_REGISTRY } from "./MindMapNode";
import { type NodeTemplate, SPECIAL_TEMPLATES } from "./mindmap-constants";

interface ToolbarProps {
  title: string;
  setTitle: (t: string) => void;
  dirty: boolean;
  isProcedure: boolean;
  templates: NodeTemplate[];
  onBack: () => void;
  onSave: () => void;
  onAddTemplate: (t: NodeTemplate) => void;
  onAddBlank: () => void;
  onAutoLayout: (dir: "TB" | "LR") => void;
  onPresentation: () => void;
  onExport: () => void;
  onTitleDirty: () => void;
}

function getTemplateIcon(iconValue: string) {
  const entry = ICON_REGISTRY.find(i => i.value === iconValue);
  return entry ? <entry.Icon className="h-4 w-4" /> : null;
}

export function MindMapToolbar({
  title, setTitle, dirty, isProcedure, templates,
  onBack, onSave, onAddTemplate, onAddBlank, onAutoLayout, onPresentation, onExport, onTitleDirty,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card/80 backdrop-blur-sm flex-wrap">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Nazad
      </Button>

      <div className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold",
        isProcedure ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-primary/15 text-primary"
      )}>
        {isProcedure ? <Workflow className="h-3.5 w-3.5" /> : <GitBranch className="h-3.5 w-3.5" />}
        {isProcedure ? "Procedura" : "Hijerarhija"}
      </div>

      <Input
        value={title}
        onChange={e => { setTitle(e.target.value); onTitleDirty(); }}
        className="max-w-[240px] h-8 text-sm font-semibold"
        placeholder="Naziv mape..."
      />

      <div className="flex-1" />

      <Button variant="outline" size="sm" onClick={onPresentation}>
        <Eye className="h-4 w-4 mr-1" /> Pregled
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <LayoutGrid className="h-4 w-4 mr-1" /> Auto-Layout
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onAutoLayout("TB")}>↓ Vertikalni (gore-dolje)</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAutoLayout("LR")}>→ Horizontalni (lijevo-desno)</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {isProcedure ? "Dodaj korak" : "Dodaj čvor"}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {templates.map(t => (
            <DropdownMenuItem key={t.icon + t.shape} onClick={() => onAddTemplate(t)} className="flex items-center gap-2.5">
              {getTemplateIcon(t.icon)}
              <span className="font-medium">{t.desc}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Specijalni čvorovi
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-52">
              {SPECIAL_TEMPLATES.map(t => (
                <DropdownMenuItem key={t.shape} onClick={() => onAddTemplate(t)} className="flex items-center gap-2.5">
                  {getTemplateIcon(t.icon)}
                  <div>
                    <span className="font-medium">{t.label}</span>
                    <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onAddBlank} className="text-muted-foreground">
            <Plus className="h-4 w-4 mr-2" /> Prazan čvor
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="outline" size="sm" onClick={onExport}>
        <FolderDown className="h-4 w-4 mr-1" /> Eksportuj u Predmet
      </Button>

      <Button size="sm" onClick={onSave} variant={dirty ? "default" : "outline"}>
        <Save className="h-4 w-4 mr-1" />
        {dirty ? "Sačuvaj" : "Sačuvano"}
      </Button>
    </div>
  );
}

export function PresentationBar({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-card/90 backdrop-blur-sm border-b border-border">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">— Režim pregleda</span>
      </div>
      <Button variant="outline" size="sm" onClick={onClose}>
        <EyeOff className="h-4 w-4 mr-1" /> Zatvori pregled
      </Button>
    </div>
  );
}
