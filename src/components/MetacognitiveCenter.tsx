import { useState, useMemo, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { default as ArrowLeft } from "lucide-react/dist/esm/icons/arrow-left";
import { default as BookOpen } from "lucide-react/dist/esm/icons/book-open";
import { default as Target } from "lucide-react/dist/esm/icons/target";
import { default as Clock } from "lucide-react/dist/esm/icons/clock";
import { default as Brain } from "lucide-react/dist/esm/icons/brain";
import { default as AlertTriangle } from "lucide-react/dist/esm/icons/alert-triangle";
import { default as CheckCircle } from "lucide-react/dist/esm/icons/check-circle";
import { default as XCircle } from "lucide-react/dist/esm/icons/x-circle";
import { default as Gauge } from "lucide-react/dist/esm/icons/gauge";
import { default as Microscope } from "lucide-react/dist/esm/icons/microscope";
import InfoPanel from "@/components/InfoPanel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ReviewLogEntry } from "@/lib/storage";
import { Card, SRSettings, DEFAULT_SR_SETTINGS } from "@/lib/spaced-repetition";
import {
  loadDiary, addDiaryEntry, DiaryEntry, setLastAnalysisDate,
  loadCalibration, CalibrationEntry, getCalibrationStats,
  getTodayReviewStats,
  getTimeDistribution, RESERVOIR_LABELS, RESERVOIR_COLORS,
} from "@/lib/metacognitive-storage";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend,
} from "recharts";
import { format, startOfDay } from "date-fns";

const FrequentErrors = lazy(() => import("@/pages/FrequentErrors"));
const CognitiveAnalytics = lazy(() => import("./CognitiveAnalytics"));

interface Props {
  cards: Card[];
  categories: string[];
  reviewLog: ReviewLogEntry[];
  onBack: () => void;
  settings?: SRSettings;
  embedded?: boolean;
  onClearErrorLog?: (cardId: string) => void;
}

export default function MetacognitiveCenter({ cards, categories, reviewLog, onBack, settings, embedded, onClearErrorLog }: Props) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6">
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <button onClick={onBack} className="text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
              <ArrowLeft className="h-4 w-4" /> Nazad
            </button>
            <h2 className="text-3xl font-serif">Dnevnik</h2>
            <p className="text-muted-foreground mt-1">Refleksije, greške, kalibracija i kognitivna dijagnostika</p>
          </div>
          <InfoPanel title="Kako radi Dnevnik?">
            <p><strong className="text-foreground">Dnevnik</strong> — bilježi dnevne refleksije, postavlja ciljeve za sutra i prati dnevnu samoanalizu.</p>
            <p><strong className="text-foreground">Greške</strong> — praćenje čestih grešaka sa statusima (Kritično/U oporavku/Savladano).</p>
            <p><strong className="text-foreground">Kalibracija</strong> — upoređuje tvoju procjenu sigurnosti (1-5) sa stvarnom ocjenom da detektuje „iluziju znanja".</p>
            <p><strong className="text-foreground">Kognicija</strong> — dublja analiza slabih tačaka, interferencije i mnemonička preporuka.</p>
          </InfoPanel>
        </div>
      )}

      <Tabs defaultValue="diary" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="diary" className="gap-1.5 text-xs sm:text-sm"><BookOpen className="h-3.5 w-3.5" /> Dnevnik</TabsTrigger>
          <TabsTrigger value="errors" className="gap-1.5 text-xs sm:text-sm"><AlertTriangle className="h-3.5 w-3.5" /> Greške</TabsTrigger>
          <TabsTrigger value="calibration" className="gap-1.5 text-xs sm:text-sm"><Target className="h-3.5 w-3.5" /> Kalibracija</TabsTrigger>
          <TabsTrigger value="cognitive" className="gap-1.5 text-xs sm:text-sm"><Microscope className="h-3.5 w-3.5" /> Kognicija</TabsTrigger>
        </TabsList>

        <TabsContent value="diary">
          <DiaryTab cards={cards} reviewLog={reviewLog} />
        </TabsContent>
        <TabsContent value="errors">
          <Suspense fallback={<div className="py-8 text-center text-muted-foreground text-sm">Učitavanje…</div>}>
            <FrequentErrors cards={cards} onBack={() => {}} onClearErrorLog={onClearErrorLog || (() => {})} embedded />
          </Suspense>
        </TabsContent>
        <TabsContent value="calibration">
          <CalibrationTab />
        </TabsContent>
        <TabsContent value="cognitive">
          <Suspense fallback={<div className="py-8 text-center text-muted-foreground text-sm">Učitavanje…</div>}>
            <CognitiveAnalytics cards={cards} categories={categories} reviewLog={reviewLog} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// DIARY TAB
// ═══════════════════════════════════════════════════════════

function DiaryTab({ cards, reviewLog }: { cards: Card[]; reviewLog: ReviewLogEntry[] }) {
  const [diary, setDiary] = useState<DiaryEntry[]>(() => loadDiary());
  const [dailyGoal, setDailyGoal] = useState("");
  const [selfAnalysis, setSelfAnalysis] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = diary.find(d => d.date === today);
  const todayStats = useMemo(() => getTodayReviewStats(reviewLog), [reviewLog]);
  const todayTime = useMemo(() => getTimeDistribution(1), []);

  const cardMap = useMemo(() => new Map(cards.map(c => [c.id, c])), [cards]);

  const handleSave = () => {
    const entry = addDiaryEntry({ date: today, dailyGoal: dailyGoal || todayEntry?.dailyGoal || "", selfAnalysis });
    setLastAnalysisDate(today);
    setDiary(prev => {
      const idx = prev.findIndex(d => d.date === today);
      if (idx >= 0) { const next = [...prev]; next[idx] = entry; return next; }
      return [...prev, entry];
    });
    setSelfAnalysis("");
  };

  const recentDays = useMemo(() => {
    const days: { date: string; successes: number; lapses: number; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dateStr = d.toISOString().slice(0, 10);
      const dayStart = startOfDay(d).getTime();
      const dayEnd = dayStart + 86400000;
      const dayEntries = reviewLog.filter(e => e.timestamp >= dayStart && e.timestamp < dayEnd);
      days.push({
        date: format(d, "EEE dd"),
        successes: dayEntries.filter(e => e.grade === 4).length,
        lapses: dayEntries.filter(e => e.grade <= 2).length,
        total: dayEntries.length,
      });
    }
    return days;
  }, [reviewLog]);

  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{todayStats.total}</div>
          <div className="text-xs text-muted-foreground mt-1">Ukupno danas</div>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="flex items-center justify-center gap-1">
            <CheckCircle className="h-4 w-4 text-success" />
            <span className="text-2xl font-bold text-success">{todayStats.successes.length}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">Uspjesi (4)</div>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="flex items-center justify-center gap-1">
            <XCircle className="h-4 w-4 text-destructive" />
            <span className="text-2xl font-bold text-destructive">{todayStats.lapses.length}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">Lapsusi (1-2)</div>
        </div>
      </div>

      {todayTime.totalMs > 60000 && (
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Radno vrijeme danas</span>
          </div>
          <div className="flex h-2.5 rounded-md overflow-hidden bg-secondary">
            {todayTime.review > 0 && <div style={{ width: `${(todayTime.review / todayTime.totalMs) * 100}%`, background: RESERVOIR_COLORS.review }} />}
            {todayTime.learning > 0 && <div style={{ width: `${(todayTime.learning / todayTime.totalMs) * 100}%`, background: RESERVOIR_COLORS.learning }} />}
            {todayTime.creative > 0 && <div style={{ width: `${(todayTime.creative / todayTime.totalMs) * 100}%`, background: RESERVOIR_COLORS.creative }} />}
            {todayTime.analysis > 0 && <div style={{ width: `${(todayTime.analysis / todayTime.totalMs) * 100}%`, background: RESERVOIR_COLORS.analysis }} />}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Efektivno: {Math.round(todayTime.cognitiveMs / 60000)} min</span>
            <span>Logistika: {Math.round(todayTime.logisticMs / 60000)} min</span>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-medium mb-4">Sedmični pregled</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={recentDays}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
            <Bar dataKey="successes" name="Uspjesi" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="lapses" name="Lapsusi" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {todayStats.lapses.length > 0 && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Današnji lapsusi
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {todayStats.lapses.map((l, i) => {
              const card = cardMap.get(l.cardId);
              return (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-destructive/5 border border-destructive/10">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${l.grade === 1 ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground"}`}>
                    {l.grade}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{card?.question || "Nepoznata kartica"}</p>
                    <p className="text-xs text-muted-foreground">{l.category}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {todayStats.successes.length > 0 && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" /> Današnji uspjesi
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {todayStats.successes.map((s, i) => {
              const card = cardMap.get(s.cardId);
              const hasMnemonic = card?.tags?.includes("memorizacija");
              return (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-success/5 border border-success/10">
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-success text-success-foreground">4</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{card?.question || "Nepoznata kartica"}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.category}
                      {hasMnemonic && " · Mnemotehnika"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" /> Dnevna samoanaliza
        </h3>
        {todayEntry && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-xs text-muted-foreground mb-1">Cilj dana:</p>
            <p className="text-sm">{todayEntry.dailyGoal || "—"}</p>
            {todayEntry.selfAnalysis && (
              <>
                <p className="text-xs text-muted-foreground mt-2 mb-1">Analiza:</p>
                <p className="text-sm">{todayEntry.selfAnalysis}</p>
              </>
            )}
          </div>
        )}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Dnevni cilj</label>
            <Input
              value={dailyGoal}
              onChange={e => setDailyGoal(e.target.value)}
              placeholder="Npr. Savladati 3 nova zakona..."
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Šta je bilo dobro? Šta mijenjam sutra?</label>
            <Textarea
              value={selfAnalysis}
              onChange={e => setSelfAnalysis(e.target.value)}
              placeholder="Kratka refleksija o današnjem učenju..."
              rows={3}
              className="text-sm"
            />
          </div>
          <Button onClick={handleSave} size="sm" disabled={!selfAnalysis.trim()}>
            Sačuvaj analizu
          </Button>
        </div>
      </div>

      {diary.filter(d => d.date !== today).length > 0 && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h3 className="text-sm font-medium">Istorija dnevnika</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {diary
              .filter(d => d.date !== today)
              .sort((a, b) => b.createdAt - a.createdAt)
              .slice(0, 14)
              .map(d => (
                <div key={d.id} className="p-3 rounded-lg bg-secondary/50 border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{d.date}</span>
                  </div>
                  {d.dailyGoal && <p className="text-xs text-muted-foreground">Cilj: {d.dailyGoal}</p>}
                  <p className="text-sm">{d.selfAnalysis}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CALIBRATION TAB
// ═══════════════════════════════════════════════════════════

function CalibrationTab() {
  const calibration = useMemo(() => loadCalibration(), []);
  const stats = useMemo(() => getCalibrationStats(calibration), [calibration]);

  const scatterData = useMemo(() => {
    return calibration.slice(-200).map(e => ({
      confidence: e.confidence,
      grade: e.actualGrade,
    }));
  }, [calibration]);

  const distributionData = useMemo(() => {
    const groups: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    calibration.forEach(e => { groups[e.confidence]?.push(e.actualGrade); });
    return Object.entries(groups).map(([conf, grades]) => ({
      confidence: `Sig. ${conf}`,
      avgGrade: grades.length > 0 ? +(grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1) : 0,
      count: grades.length,
    }));
  }, [calibration]);

  const pieData = [
    { name: "Prekalibrisan", value: stats.overconfident, fill: "hsl(var(--destructive))" },
    { name: "Potkalibris.", value: stats.underconfident, fill: "hsl(var(--warning))" },
    { name: "Kalibrisan", value: stats.calibrated, fill: "hsl(var(--success))" },
  ].filter(d => d.value > 0);

  if (calibration.length === 0) {
    return (
      <div className="mt-8 text-center space-y-3 py-12">
        <Gauge className="h-12 w-12 mx-auto text-muted-foreground/30" />
        <h3 className="text-lg font-medium">Nema podataka o kalibraciji</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Tokom ponavljanja, prije otkrivanja odgovora bićete upitani za nivo sigurnosti (1-5).
          Podaci se automatski prikupljaju.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground mt-1">Mjerenja</div>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-success">{stats.calibrated}</div>
          <div className="text-xs text-muted-foreground mt-1">Kalibrisano</div>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className={`text-2xl font-bold ${stats.avgDelta > 0.3 ? "text-destructive" : stats.avgDelta < -0.3 ? "text-warning" : "text-success"}`}>
            {stats.avgDelta > 0 ? "+" : ""}{stats.avgDelta.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats.avgDelta > 0.3 ? "Iluzija znanja ⚠️" : stats.avgDelta < -0.3 ? "Potcjenjivanje" : "Dobra kalibracija ✓"}
          </div>
        </div>
      </div>

      {stats.avgDelta > 0.3 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">Iluzija znanja detektovana</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Vaša procjena sigurnosti je u prosjeku {stats.avgDelta.toFixed(1)} poena viša od stvarnog znanja.
              Usporite i budite kritičniji pri procjeni.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-medium mb-4">Distribucija kalibracije</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
              {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-medium mb-4">Sigurnost vs. Stvarna ocjena</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={distributionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="confidence" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis domain={[0, 4]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
            <Bar dataKey="avgGrade" name="Prosj. ocjena" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground mt-2">
          Idealno: svaki nivo sigurnosti odgovara proporcionalnoj ocjeni. Ako su "Sigurnost 5" ocjene niske — imate iluziju znanja.
        </p>
      </div>
    </div>
  );
}
