import { useState, useCallback, useEffect } from "react";
import { Save, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { type Source } from "@/lib/db";
import { saveSource, extractOutline } from "@/lib/sources-storage";
import { sanitizeHtml } from "@/lib/sanitize";
import { injectHeadingIds } from "@/lib/sources-storage";
import { parseArticles } from "@/lib/article-parser";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface Props {
  source: Source;
  categoryId: string;
  onClose: () => void;
  onSourceUpdated: (source: Source) => void;
}

export default function SourceEditor({ source, categoryId, onClose, onSourceUpdated }: Props) {
  const [title, setTitle] = useState(source.title);
  const [slMarkings, setSlMarkings] = useState(source.slMarkings || "");
  const [dateStr, setDateStr] = useState(source.date);
  const [dateObj, setDateObj] = useState<Date | undefined>(source.date ? new Date(source.date) : undefined);
  const [isExclusive, setIsExclusive] = useState(source.isExclusive || false);
  const [dirty, setDirty] = useState(false);

  // Update source text
  const [newText, setNewText] = useState("");
  const [textOpen, setTextOpen] = useState(false);

  useEffect(() => {
    if (title !== source.title || slMarkings !== (source.slMarkings || "") || dateStr !== source.date || isExclusive !== (source.isExclusive || false)) {
      setDirty(true);
    }
  }, [title, slMarkings, dateStr, isExclusive, source]);

  const handleSave = useCallback(async () => {
    let htmlContent = source.htmlContent;
    let outline = source.outline;
    let articles = source.articles;

    // If user pasted new text, update HTML
    if (newText.trim()) {
      const cleanHtml = sanitizeHtml(newText);
      const { promoteHeadings } = await import("@/lib/heading-promotion");
      const promotedHtml = promoteHeadings(cleanHtml);
      htmlContent = injectHeadingIds(promotedHtml);
      outline = extractOutline(htmlContent);
      articles = parseArticles(htmlContent);
    }

    const updated: Source = {
      ...source,
      title: title.trim() || source.title,
      slMarkings: slMarkings.trim() || undefined,
      date: dateStr,
      isExclusive,
      htmlContent,
      outline,
      articles,
      version: (source.version || 1) + (newText.trim() ? 1 : 0),
      updatedAt: Date.now(),
    };
    await saveSource(updated);
    onSourceUpdated(updated);
    setDirty(false);
    setNewText("");
    toast({ title: "Izvor sačuvan", description: updated.title });
    onClose();
  }, [source, title, slMarkings, dateStr, isExclusive, newText, onSourceUpdated, onClose]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Uredi metapodatke izvora</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="source-title">Naziv</Label>
            <Input id="source-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Puni naziv zakona..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="source-sl">SL oznake</Label>
            <Input id="source-sl" value={slMarkings} onChange={e => setSlMarkings(e.target.value)} placeholder='Sl. list CG br. 40/2008...' />
          </div>
          <div className="space-y-1.5">
            <Label>Datum</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateObj && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateObj ? format(dateObj, "PPP") : "Odaberi datum"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateObj}
                  onSelect={(d) => { setDateObj(d); if (d) setDateStr(format(d, "yyyy-MM-dd")); }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="exclusive" checked={isExclusive} onCheckedChange={setIsExclusive} />
            <Label htmlFor="exclusive" className="text-xs leading-tight cursor-pointer">
              Ovo je isključivi/glavni izvor za ovu kategoriju
            </Label>
          </div>

          {source.officialGazetteInfo && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
              <span className="font-medium">Auto-detektovano:</span> {source.officialGazetteInfo}
            </div>
          )}

          {/* Update source text */}
          <Collapsible open={textOpen} onOpenChange={setTextOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", textOpen && "rotate-90")} />
              Ažuriraj tekst izvora
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <Textarea
                value={newText}
                onChange={e => { setNewText(e.target.value); setDirty(true); }}
                placeholder="Zalijepite novu verziju teksta (HTML) ovdje. Postojeće kartice neće izgubiti linkove."
                className="min-h-[120px] text-xs"
              />
            </CollapsibleContent>
          </Collapsible>

          <Button onClick={handleSave} disabled={!dirty && !newText.trim()} className="w-full gap-2">
            <Save className="h-4 w-4" />
            Sačuvaj
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
