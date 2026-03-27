/**
 * Source Registry — alias/normalization system for Source labels.
 * Maps raw Source.label strings to canonical "Master Source" names.
 * Pure functions, no React imports.
 */
import { Card } from "./spaced-repetition";
import type { Source } from "./db";

// ─── Types ──────────────────────────────────────────────

export interface SourceAlias {
  rawLabel: string;
  masterSource: string;
}

export interface CategoryOverride {
  category: string;
  forcedMode: "A" | "B" | null;
}

export interface SourceRegistry {
  aliases: SourceAlias[];
  overrides: CategoryOverride[];
}

export type DepthMode = "A" | "B";

export interface MasterSourceInfo {
  masterSource: string;
  rawLabels: string[];
  cardCount: number;
}

// ─── Storage ────────────────────────────────────────────

const REGISTRY_KEY = "codex-source-registry";

export function loadSourceRegistry(): SourceRegistry {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        aliases: Array.isArray(parsed.aliases) ? parsed.aliases : [],
        overrides: Array.isArray(parsed.overrides) ? parsed.overrides : [],
      };
    }
  } catch { /* ignore */ }
  return { aliases: [], overrides: [] };
}

export function saveSourceRegistry(registry: SourceRegistry): void {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
}

// ─── Resolution ─────────────────────────────────────────

/** Build a fast lookup map from raw labels to master source names */
export function buildAliasMap(registry: SourceRegistry): Map<string, string> {
  const map = new Map<string, string>();
  for (const alias of registry.aliases) {
    map.set(alias.rawLabel, alias.masterSource);
  }
  return map;
}

/** Resolve a raw Source.label to its Master Source name */
export function resolveMasterSource(
  rawLabel: string,
  aliasMap: Map<string, string>,
): string {
  return aliasMap.get(rawLabel) || rawLabel;
}

/** Build a source lookup map from Source[] */
export function buildSourceMap(sources: Source[]): Map<string, Source> {
  const map = new Map<string, Source>();
  for (const s of sources) map.set(s.id, s);
  return map;
}

// ─── Unique Sources ─────────────────────────────────────

export function getUniqueSources(
  cards: Card[],
  sourceMap: Map<string, Source>,
  aliasMap: Map<string, string>,
): MasterSourceInfo[] {
  const masterGroups = new Map<string, { rawLabels: Set<string>; count: number }>();

  for (const card of cards) {
    if (!card.sourceId) continue;
    const source = sourceMap.get(card.sourceId);
    if (!source) continue;

    const rawLabel = source.label;
    const master = resolveMasterSource(rawLabel, aliasMap);
    const group = masterGroups.get(master);
    if (group) {
      group.rawLabels.add(rawLabel);
      group.count++;
    } else {
      masterGroups.set(master, { rawLabels: new Set([rawLabel]), count: 1 });
    }
  }

  return Array.from(masterGroups.entries()).map(([masterSource, { rawLabels, count }]) => ({
    masterSource,
    rawLabels: Array.from(rawLabels),
    cardCount: count,
  }));
}

// ─── A/B Depth Logic ────────────────────────────────────

/**
 * Determine the depth mode for a category:
 * - Mode A (Multi-Source): ≥2 distinct Master Sources → L1=Source, L2=Subcategory
 * - Mode B (Deep-Dive): 1 source dominates ≥90% → L1=Subcategory, L2=Chapter
 *
 * Manual override takes precedence.
 */
export function getCategoryDepthMode(
  category: string,
  cards: Card[],
  sourceMap: Map<string, Source>,
  aliasMap: Map<string, string>,
  registry: SourceRegistry,
): DepthMode {
  // Check manual override first
  const override = registry.overrides.find(o => o.category === category);
  if (override?.forcedMode) return override.forcedMode;

  // Count distinct Master Sources in this category
  const catCards = cards.filter(c => c.category === category);
  const sourceLinked = catCards.filter(c => c.sourceId);

  if (sourceLinked.length === 0) return "B"; // no sources → use subcategory/chapter

  const sourceCounts = new Map<string, number>();
  for (const card of sourceLinked) {
    const source = sourceMap.get(card.sourceId!);
    if (!source) continue;
    const master = resolveMasterSource(source.label, aliasMap);
    sourceCounts.set(master, (sourceCounts.get(master) || 0) + 1);
  }

  const distinctSources = sourceCounts.size;

  if (distinctSources >= 2) return "A";

  // Check if single source dominates ≥90%
  if (distinctSources === 1) {
    const dominant = Array.from(sourceCounts.values())[0];
    if (dominant / catCards.length >= 0.9) return "B";
  }

  return "B";
}

/**
 * Get the Master Source name for a card (or "Bez izvora" if no sourceId)
 */
export function getCardMasterSource(
  card: Card,
  sourceMap: Map<string, Source>,
  aliasMap: Map<string, string>,
): string {
  if (!card.sourceId) return "Bez izvora";
  const source = sourceMap.get(card.sourceId);
  if (!source) return "Bez izvora";
  return resolveMasterSource(source.label, aliasMap);
}
