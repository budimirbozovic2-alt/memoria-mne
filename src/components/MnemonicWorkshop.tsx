import { useState, useMemo } from "react";
import { MnemonicCard, MnemonicStatus, loadMajorSystem, resolveNumber, extractNumbers, detectEnumerationItems } from "@/lib/mnemonic-storage";
import { ArrowLeft, Brain, Film, Type, ChevronDown, ChevronRight, Sparkles, CheckCircle2, Wrench, Hash, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  cards: MnemonicCard[];
  onUpdateCard: (id: string, updates: Partial<MnemonicCard>) => void;
  onBack: () => void;
}

const STATUS_CONFIG: Record<MnemonicStatus, { label: string; icon: typeof Brain; color: string }> = {
  "new": { label: "Nova", icon: Sparkles, color: "text-muted-foreground" },
  "in-workshop": { label: "U radionici", icon: Wrench, color: "text-warning" },
  "ready": { label: "Spremna", icon: CheckCircle2, color: "text-success" },
};

export default function MnemonicWorkshop({ cards, onUpdateCard, onBack }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<MnemonicStatus | "all">("all");

  // Live-load Major System so settings changes are instant
  const majorSystem = useMemo(() => loadMajorSystem(), [expandedId]);

  const filtered = filterStatus === "all" ? cards : cards.filter(c => c.mnemonicStatus === filterStatus);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
          <ArrowLeft className="h-4 w-4" /> Nazad
        </button>
        <h2 className="text-3xl font-serif flex items-center gap-3">
          <Wrench className="h-7 w-7 text-primary" /> Radionica mentalnih kuka
        </h2>
        <p className="text-muted-foreground mt-1">Kreiraj mentalni video i akronim za svaku karticu.</p>
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {(["all", "new", "in-workshop", "ready"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === status ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            {status === "all" ? `Sve (${cards.length})` : `${STATUS_CONFIG[status].label} (${cards.filter(c => c.mnemonicStatus === status).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Brain className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Nema kartica u ovoj kategoriji.</p>
          <p className="text-sm mt-1">Označi kartice tagom "Memorizacija" da ih dodaš ovdje.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((card) => {
            const isExpanded = expandedId === card.id;
            const statusConf = STATUS_CONFIG[card.mnemonicStatus];
            const StatusIcon = statusConf.icon;

            // Auto-structuring: extract numbers and enumerations from all sections
            const allContent = card.sections.map(s => s.content).join(" ");
            const numbers = isExpanded ? extractNumbers(allContent) : [];
            const enumItems = isExpanded ? detectEnumerationItems(allContent) : [];

            return (
              <div key={card.id} className="rounded-xl border bg-card overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : card.id)}
                  className="w-full p-4 text-left flex items-center gap-3 hover:bg-secondary/30 transition-colors"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{card.question}</p>
                    <p className="text-xs text-muted-foreground">{card.category}{card.subcategory ? ` / ${card.subcategory}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {numbers.length > 0 && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{numbers.length} 🔢</span>}
                    <div className={`flex items-center gap-1 text-xs font-medium ${statusConf.color}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusConf.label}
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-4 border-t pt-4">
                        {/* Sections preview */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sadržaj</p>
                          {card.sections.map((s, i) => (
                            <div key={i} className="rounded-lg bg-secondary/30 p-3">
                              <p className="text-xs font-medium text-muted-foreground mb-1">{s.title}</p>
                              <div className="text-sm prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: s.content }} />
                            </div>
                          ))}
                        </div>

                        {/* Major System suggestions for numbers */}
                        {numbers.length > 0 && (
                          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                            <p className="text-xs font-medium text-primary uppercase tracking-wider flex items-center gap-1.5">
                              <Hash className="h-3.5 w-3.5" /> Major sistem — sugestije
                            </p>
                            <div className="space-y-1.5">
                              {numbers.map(({ number, context }, idx) => {
                                const resolved = resolveNumber(number, majorSystem);
                                return (
                                  <div key={idx} className="flex items-start gap-2 text-sm">
                                    <span className="font-mono font-bold text-primary min-w-[40px] text-right">{number}</span>
                                    <span className="text-foreground font-medium">= {resolved.term}</span>
                                    {resolved.location && (
                                      <span className="flex items-center gap-0.5 text-xs text-warning">
                                        <MapPin className="h-3 w-3" /> {resolved.location}
                                      </span>
                                    )}
                                    <span className="text-xs text-muted-foreground ml-auto truncate max-w-[200px]">„{context}"</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Enumeration detection → Acronym helper */}
                        {enumItems.length >= 2 && (
                          <div className="rounded-lg border border-warning/20 bg-warning/5 p-3 space-y-2">
                            <p className="text-xs font-medium text-warning uppercase tracking-wider flex items-center gap-1.5">
                              <Type className="h-3.5 w-3.5" /> Nabrajanje detektovano — akronim ({enumItems.length} slova)
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {enumItems.map((item, idx) => {
                                const firstLetter = item.trim()[0]?.toUpperCase() || "?";
                                return (
                                  <div key={idx} className="flex items-center gap-1 px-2 py-1 rounded-md bg-background border text-xs">
                                    <span className="font-bold text-warning">{firstLetter}</span>
                                    <span className="text-muted-foreground truncate max-w-[120px]">{item}</span>
                                  </div>
                                );
                              })}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Sugestija: <strong className="text-foreground">{enumItems.map(i => i.trim()[0]?.toUpperCase() || "").join("")}</strong>
                            </p>
                          </div>
                        )}

                        {/* Mental Video */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-1.5">
                            <Film className="h-3.5 w-3.5 text-primary" /> Mentalni video
                          </label>
                          <textarea
                            value={card.mnemonicVideo}
                            onChange={(e) => onUpdateCard(card.id, { mnemonicVideo: e.target.value, mnemonicStatus: card.mnemonicStatus === "new" ? "in-workshop" : card.mnemonicStatus })}
                            placeholder="Opiši živopisnu mentalnu scenu koja ti pomaže da zapamtiš ovu informaciju..."
                            className="w-full min-h-[80px] px-3 py-2 rounded-lg border bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>

                        {/* Acronym */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-1.5">
                            <Type className="h-3.5 w-3.5 text-primary" /> Akronim / Mentalna kuka
                            {enumItems.length >= 2 && (
                              <span className="text-xs text-muted-foreground ml-1">({enumItems.length} slova potrebno)</span>
                            )}
                          </label>
                          <input
                            value={card.acronym}
                            onChange={(e) => onUpdateCard(card.id, { acronym: e.target.value, mnemonicStatus: card.mnemonicStatus === "new" ? "in-workshop" : card.mnemonicStatus })}
                            placeholder={enumItems.length >= 2
                              ? `Unesite akronim od ${enumItems.length} slova (npr. ${enumItems.map(i => i.trim()[0]?.toUpperCase() || "").join("")})`
                              : "Npr. kratka reč, broj iz Major Sistema, asocijacija..."}
                            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                          {enumItems.length >= 2 && card.acronym.length > 0 && card.acronym.length !== enumItems.length && (
                            <p className="text-xs text-warning">⚠ Akronim ima {card.acronym.length} slova, a nabrajanje ima {enumItems.length} stavki</p>
                          )}
                        </div>

                        {/* Status + Stats */}
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            {(["new", "in-workshop", "ready"] as MnemonicStatus[]).map((s) => {
                              const conf = STATUS_CONFIG[s];
                              const Icon = conf.icon;
                              return (
                                <button
                                  key={s}
                                  onClick={() => onUpdateCard(card.id, { mnemonicStatus: s })}
                                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    card.mnemonicStatus === s ? "bg-primary text-primary-foreground" : "border text-muted-foreground hover:bg-secondary"
                                  }`}
                                >
                                  <Icon className="h-3 w-3" />
                                  {conf.label}
                                </button>
                              );
                            })}
                          </div>
                          {card.testCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {card.successCount}/{card.testCount} tačno ({Math.round(card.successCount / card.testCount * 100)}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
