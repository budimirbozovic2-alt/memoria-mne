import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Gauge, Type, Volume2, VolumeX, Settings2 } from "lucide-react";
import { WPM_OPTIONS, FONT_SIZES } from "./speed-reader-constants";
import type { TTSSettings } from "@/lib/tts";

interface Props {
  playing: boolean;
  currentWordIdx: number;
  totalWords: number;
  wpm: number;
  setWpm: (v: number) => void;
  fontSize: string;
  setFontSize: (v: string) => void;
  progress: number;
  ttsEnabled: boolean;
  setTtsEnabled: (v: boolean) => void;
  ttsMode: "natural" | "wpm";
  setTtsMode: (v: "natural" | "wpm") => void;
  ttsSettings: TTSSettings;
  showTtsSettings: boolean;
  setShowTtsSettings: (v: boolean) => void;
  voices: SpeechSynthesisVoice[];
  updateTtsSettings: (s: TTSSettings) => void;
  stopTts: () => void;
  handlePlayPause: () => void;
  handleReset: () => void;
  handlePrevWord: () => void;
  handleNextWord: () => void;
}

export default function SpeedReaderControls({
  playing, currentWordIdx, totalWords, wpm, setWpm, fontSize, setFontSize,
  progress, ttsEnabled, setTtsEnabled, ttsMode, setTtsMode,
  ttsSettings, showTtsSettings, setShowTtsSettings, voices,
  updateTtsSettings, stopTts,
  handlePlayPause, handleReset, handlePrevWord, handleNextWord,
}: Props) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={handlePrevWord} disabled={currentWordIdx === 0} className="p-2 rounded-lg hover:bg-secondary disabled:opacity-30 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={handlePlayPause} className="p-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button onClick={handleNextWord} disabled={currentWordIdx >= totalWords - 1} className="p-2 rounded-lg hover:bg-secondary disabled:opacity-30 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={handleReset} className="p-2 rounded-lg hover:bg-secondary transition-colors" title="Resetuj">
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="w-px h-6 bg-border" />
          <button
            onClick={() => { setTtsEnabled(!ttsEnabled); stopTts(); }}
            className={`p-2 rounded-lg transition-colors ${ttsEnabled ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
            title={ttsEnabled ? "Isključi glasovno praćenje" : "Uključi glasovno praćenje"}
          >
            {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          {ttsEnabled && (
            <>
              <div className="flex gap-0.5 rounded-lg border p-0.5">
                <button onClick={() => { setTtsMode("natural"); stopTts(); }} className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${ttsMode === "natural" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Prirodno</button>
                <button onClick={() => { setTtsMode("wpm"); stopTts(); }} className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${ttsMode === "wpm" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>WPM</button>
              </div>
              <button onClick={() => setShowTtsSettings(!showTtsSettings)} className={`p-2 rounded-lg transition-colors ${showTtsSettings ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`} title="TTS podešavanja">
                <Settings2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {(!ttsEnabled || ttsMode === "wpm") && (
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1">
              {WPM_OPTIONS.map(w => (
                <button key={w} onClick={() => setWpm(w)} className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${wpm === w ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>{w}</button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground ml-1">WPM</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1">
            {FONT_SIZES.map(f => (
              <button key={f.label} onClick={() => setFontSize(f.value)} className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${fontSize === f.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>{f.label}</button>
            ))}
          </div>
        </div>
      </div>

      {ttsEnabled && showTtsSettings && (
        <div className="rounded-lg border bg-secondary/30 p-3 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Brzina govora</label>
              <span className="text-xs text-muted-foreground tabular-nums">{ttsSettings.rate.toFixed(2)}×</span>
            </div>
            <input type="range" min="0.5" max="2" step="0.05" value={ttsSettings.rate}
              onChange={(e) => updateTtsSettings({ ...ttsSettings, rate: parseFloat(e.target.value) })}
              className="w-full h-1.5 rounded-full appearance-none bg-secondary cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground"><span>Sporo</span><span>Normalno</span><span>Brzo</span></div>
          </div>
          {voices.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Glas</label>
              <select
                value={ttsSettings.voiceURI || "__default__"}
                onChange={(e) => updateTtsSettings({ ...ttsSettings, voiceURI: e.target.value === "__default__" ? "" : e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs"
              >
                <option value="__default__">Sistemski podrazumijevani</option>
                {voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      <div className="space-y-1">
        <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-200" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Riječ {currentWordIdx + 1} / {totalWords}</span>
          <span>{Math.ceil((totalWords - currentWordIdx) / wpm)} min preostalo</span>
        </div>
      </div>
    </div>
  );
}
