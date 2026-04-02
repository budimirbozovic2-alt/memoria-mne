import { MutableRefObject } from "react";
import type { Segment } from "./speed-reader-constants";

interface Props {
  segments: Segment[];
  activeSegment: Segment | null;
  currentWordIdx: number;
  setCurrentWordIdx: (v: number) => void;
  setPlaying: (v: boolean) => void;
  fontSize: string;
  totalWords: number;
  wordRefs: MutableRefObject<(HTMLSpanElement | null)[]>;
}

export default function SpeedReaderDisplay({
  segments, activeSegment, currentWordIdx, setCurrentWordIdx, setPlaying,
  fontSize, totalWords, wordRefs,
}: Props) {
  return (
    <div className="rounded-xl border bg-card p-6 sm:p-8 min-h-[40vh] max-h-[60vh] overflow-y-auto">
      {totalWords === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nema tekstualnog sadržaja.</p>
      ) : (
        <div className="space-y-8">
          {segments.map((seg, segIdx) => {
            const isCurrentSeg = activeSegment === seg;
            const titleWordCount = (seg.sectionTitle || "").split(/\s+/).filter(Boolean).length;
            return (
              <div key={segIdx}>
                {titleWordCount > 0 && (
                  <div className={`mb-4 pt-4 ${segIdx > 0 ? "border-t-2 border-primary/20" : ""}`}>
                    <h3 className="text-2xl font-bold select-none flex flex-wrap gap-1">
                      {seg.words.slice(0, titleWordCount).map((word, wi) => {
                        const globalIdx = seg.globalStartIdx + wi;
                        return (
                          <span
                            key={globalIdx}
                            ref={el => { wordRefs.current[globalIdx] = el; }}
                            className={`inline-block py-1 px-1 rounded transition-all duration-150 cursor-pointer ${
                              globalIdx === currentWordIdx
                                ? "bg-primary text-primary-foreground scale-105 shadow-md"
                                : globalIdx < currentWordIdx
                                ? "text-muted-foreground/50"
                                : isCurrentSeg ? "text-foreground" : "text-muted-foreground/70"
                            }`}
                            onClick={() => { setCurrentWordIdx(globalIdx); setPlaying(false); }}
                          >
                            {word}
                          </span>
                        );
                      })}
                    </h3>
                  </div>
                )}
                <p className={`${fontSize} leading-relaxed select-none`}>
                  {seg.words.slice(titleWordCount).map((word, wi) => {
                    const globalIdx = seg.globalStartIdx + titleWordCount + wi;
                    return (
                      <span
                        key={globalIdx}
                        ref={el => { wordRefs.current[globalIdx] = el; }}
                        className={`inline-block mr-[0.35em] py-0.5 px-0.5 rounded transition-all duration-150 cursor-pointer ${
                          globalIdx === currentWordIdx
                            ? "bg-primary text-primary-foreground scale-105 shadow-sm"
                            : globalIdx < currentWordIdx
                            ? "text-muted-foreground/60"
                            : "text-foreground"
                        }`}
                        onClick={() => { setCurrentWordIdx(globalIdx); setPlaying(false); }}
                      >
                        {word}
                      </span>
                    );
                  })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
