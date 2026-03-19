import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { MnemonicCard } from "@/lib/mnemonic-storage";
import { ArrowLeft, Brain, CheckCircle, XCircle, RotateCcw, Zap, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  cards: MnemonicCard[];
  onRecordResult: (cardId: string, success: boolean) => void;
  onBack: () => void;
}

const RECALL_TIME_LIMIT = 3; // seconds

export default function MnemonicTest({ cards, onRecordResult, onBack }: Props) {
  const testableCards = useMemo(() => cards.filter(c => c.mnemonicStatus !== "new"), [cards]);
  const [phase, setPhase] = useState<"reminder" | "test" | "finished">("reminder");
  const [queue, setQueue] = useState<MnemonicCard[]>(() => [...testableCards].sort(() => Math.random() - 0.5));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTrigger, setShowTrigger] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(RECALL_TIME_LIMIT);
  const [timedOut, setTimedOut] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentCard = queue[currentIndex];

  // Timer logic
  useEffect(() => {
    if (!timerActive) return;
    setTimeLeft(RECALL_TIME_LIMIT);
    setTimedOut(false);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          clearInterval(timerRef.current!);
          setTimedOut(true);
          setTimerActive(false);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive]);

  const startRecall = useCallback(() => {
    setShowTrigger(true);
    setTimerActive(true);
    setTimedOut(false);
  }, []);

  const handleResult = useCallback((success: boolean) => {
    if (!currentCard) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerActive(false);
    onRecordResult(currentCard.id, success);
    setSessionStats(prev => ({
      correct: prev.correct + (success ? 1 : 0),
      wrong: prev.wrong + (success ? 0 : 1),
    }));
    setShowTrigger(false);
    setTimedOut(false);
    if (currentIndex + 1 >= queue.length) {
      setPhase("finished");
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentCard, currentIndex, queue.length, onRecordResult]);

  // Auto-fail on timeout
  useEffect(() => {
    if (timedOut && currentCard) {
      // Don't auto-advance, let user see the timeout state
    }
  }, [timedOut, currentCard]);

  const restart = () => {
    setQueue([...testableCards].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setShowTrigger(false);
    setTimerActive(false);
    setTimedOut(false);
    setSessionStats({ correct: 0, wrong: 0 });
    setPhase("reminder");
  };

  if (testableCards.length === 0) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Nazad
        </button>
        <div className="text-center py-16">
          <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">Nema kartica spremnih za testiranje.</p>
          <p className="text-sm text-muted-foreground mt-1">Obradi kartice u Radionici prvo (status "U radionici" ili "Spremna").</p>
        </div>
      </div>
    );
  }

  // Pre-session reminder
  if (phase === "reminder") {
    return (
      <div className="max-w-xl mx-auto space-y-8">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Nazad
        </button>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12 space-y-6"
        >
          <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Zap className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-3xl font-serif">Aktiviraj mentalni okidač</h2>
          <div className="max-w-sm mx-auto space-y-3 text-sm text-muted-foreground">
            <p>Prije početka testiranja, pripremi se mentalno:</p>
            <div className="rounded-xl border bg-card p-4 text-left space-y-2">
              <p className="flex items-center gap-2"><span className="text-primary font-bold">1.</span> Zatvori oči na 3 sekunde</p>
              <p className="flex items-center gap-2"><span className="text-primary font-bold">2.</span> Vizualizuj svoju "mentalnu sobu"</p>
              <p className="flex items-center gap-2"><span className="text-primary font-bold">3.</span> Aktiviraj asocijativni film za svaku karticu</p>
            </div>
            <p className="text-xs">
              <Timer className="inline h-3 w-3 mr-1" />
              Imaš <strong className="text-foreground">{RECALL_TIME_LIMIT} sekunde</strong> da prizoveš mentalnu kuku za svaku karticu.
            </p>
          </div>
          <Button onClick={() => setPhase("test")} size="lg" className="gap-2">
            <Zap className="h-4 w-4" /> Započni testiranje
          </Button>
        </motion.div>
      </div>
    );
  }

  // Finished
  if (phase === "finished") {
    const total = sessionStats.correct + sessionStats.wrong;
    const pct = total > 0 ? Math.round(sessionStats.correct / total * 100) : 0;
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Nazad
        </button>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 space-y-6">
          <Brain className="h-16 w-16 mx-auto text-primary" />
          <h2 className="text-3xl font-serif">Testiranje završeno!</h2>
          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
            <div className="rounded-xl bg-card border p-4">
              <p className="text-2xl font-serif text-success">{sessionStats.correct}</p>
              <p className="text-xs text-muted-foreground">Tačno</p>
            </div>
            <div className="rounded-xl bg-card border p-4">
              <p className="text-2xl font-serif text-destructive">{sessionStats.wrong}</p>
              <p className="text-xs text-muted-foreground">Netačno</p>
            </div>
            <div className="rounded-xl bg-card border p-4">
              <p className={`text-2xl font-serif ${pct >= 70 ? "text-success" : pct >= 40 ? "text-warning" : "text-destructive"}`}>{pct}%</p>
              <p className="text-xs text-muted-foreground">Uspješnost</p>
            </div>
          </div>
          <Button onClick={restart} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Ponovi test
          </Button>
        </motion.div>
      </div>
    );
  }

  // Main test phase
  const hasTrigger = !!(currentCard?.mnemonicVideo || currentCard?.acronym);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Nazad
        </button>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{currentIndex + 1} / {queue.length}</span>
          <span className="text-success">{sessionStats.correct} ✓</span>
          <span className="text-destructive">{sessionStats.wrong} ✗</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex) / queue.length) * 100}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentCard.id + currentIndex}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className="rounded-xl border bg-card p-6 space-y-6"
        >
          {/* Question */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">{currentCard.category}{currentCard.subcategory ? ` / ${currentCard.subcategory}` : ""}</p>
            <h3 className="text-xl font-serif">{currentCard.question}</h3>
          </div>

          {/* Phase 1: Start recall timer */}
          {!showTrigger && !timedOut && (
            <Button onClick={startRecall} variant="outline" className="w-full gap-2">
              <Zap className="h-4 w-4" /> Prizovi mentalnu kuku ({RECALL_TIME_LIMIT}s)
            </Button>
          )}

          {/* Phase 2: Timer running — show ONLY the user's mnemonic trigger */}
          {showTrigger && !timedOut && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Timer bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground"><Timer className="h-3 w-3" /> Vrijeme za prizivanje</span>
                  <span className={`font-mono font-bold tabular-nums ${timeLeft <= 1 ? "text-destructive" : "text-primary"}`}>{timeLeft.toFixed(1)}s</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full transition-colors ${timeLeft <= 1 ? "bg-destructive" : "bg-primary"}`}
                    style={{ width: `${(timeLeft / RECALL_TIME_LIMIT) * 100}%` }}
                  />
                </div>
              </div>

              {/* Show ONLY user's mnemonic, NOT original text */}
              {hasTrigger ? (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-2">
                  <p className="text-xs font-medium text-primary uppercase tracking-wider">Tvoj okidač</p>
                  {currentCard.acronym && <p className="text-lg font-bold">{currentCard.acronym}</p>}
                  {currentCard.mnemonicVideo && <p className="text-sm italic text-muted-foreground">{currentCard.mnemonicVideo}</p>}
                </div>
              ) : (
                <div className="rounded-lg bg-warning/5 border border-warning/20 p-4">
                  <p className="text-sm text-warning">⚠ Nema sačuvanog okidača. Obradi ovu karticu u Radionici.</p>
                </div>
              )}

              {/* Answer buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => handleResult(false)} variant="outline" className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10">
                  <XCircle className="h-4 w-4" /> Ne sjećam se
                </Button>
                <Button onClick={() => handleResult(true)} className="gap-2 bg-success text-success-foreground hover:bg-success/90">
                  <CheckCircle className="h-4 w-4" /> Znam!
                </Button>
              </div>
            </motion.div>
          )}

          {/* Phase 3: Timed out */}
          {timedOut && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-center space-y-2">
                <Timer className="h-8 w-8 mx-auto text-destructive" />
                <p className="text-sm font-medium text-destructive">Vrijeme isteklo!</p>
                <p className="text-xs text-muted-foreground">Kuka nije prizvana u {RECALL_TIME_LIMIT} sekunde.</p>
              </div>

              {/* Show trigger for learning */}
              {hasTrigger && (
                <div className="rounded-lg bg-secondary/30 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Tvoj okidač je bio:</p>
                  {currentCard.acronym && <p className="text-sm font-medium">{currentCard.acronym}</p>}
                  {currentCard.mnemonicVideo && <p className="text-sm italic text-muted-foreground">{currentCard.mnemonicVideo}</p>}
                </div>
              )}

              <Button onClick={() => handleResult(false)} variant="outline" className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10">
                <XCircle className="h-4 w-4" /> Dalje (netačno)
              </Button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
