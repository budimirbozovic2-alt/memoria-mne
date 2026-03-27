

# ACTION 1: Execute Points 1 & 2

## Point 1: `src/lib/storage.ts` — Delete line 1
Remove the entire unused import line:
```
import { Card, createSection, SRSettings, DEFAULT_SR_SETTINGS, SectionState } from "./spaced-repetition";
```
None of these symbols are used in the file.

## Point 2: `src/components/KnowledgeMap.tsx` — Clean imports + blank lines (lines 1-15)
Replace lines 1-15 with:
```ts
import { useState, useRef, useCallback, lazy, Suspense } from "react";
import { Card, SectionState } from "@/lib/spaced-repetition";
import { motion } from "framer-motion";
import { TabSkeleton } from "@/components/ui/page-skeleton";
import { ArrowLeft, ChevronRight, Search, BookOpen, BarChart3, HelpCircle, ArrowUp, ArrowDown, ListOrdered } from "lucide-react";
```
Removed: `useMemo`, `startTransition`, `AnimatePresence`, and 10 blank lines.

## Guardrails: No lucide deep imports altered (these are already barrel — they were that way before). No other files touched.

