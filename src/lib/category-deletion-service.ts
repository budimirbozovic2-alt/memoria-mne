// ─── Category Deletion Service (A1+F1) ─────────────────
// Single transactional cascade for `deleteCategory`. Replaces the scattered
// ad-hoc deletes that left orphans in:
//   • knowledgeBaseArticles (Zettelkasten)
//   • mindMaps
//   • mnemonics
//   • settings (subject_settings:<categoryId>)
//   • plannerConfig (subjectOrder, hardSubjects, legacy phases.categories)
//   • examiner-profile-cache (in-memory)
//   • backlink-index (in-memory, per-subject)
//
// Cards + sources are still handled by the orchestrator (useCategoryManagement)
// because they share the same in-memory `cardMapRef` mutation path and need
// the optional re-parent semantics (purgeCards toggle).
import { db } from "@/lib/db";
import { invalidateMindMapsCache } from "@/lib/mindmap-storage";
import { invalidateSourcesCache } from "@/lib/sources-storage";
import { clearSubjectSettings } from "@/lib/subject-settings";
import { invalidateExaminerProfile } from "@/lib/examiner-profile-cache";
import { backlinkIndex } from "@/lib/backlink-index";

const SUBJECT_SETTINGS_PREFIX = "subject_settings:";

export interface CascadeResult {
  articles: number;
  mindMaps: number;
  mnemonics: number;
  settings: number;
  plannerScrubbed: boolean;
  cardsAffected: number;
  sourcesAffected: number;
}

interface PlannerConfigShape {
  subjectOrder?: string[];
  hardSubjects?: string[];
  phases?: { categories?: string[] }[];
  [k: string]: unknown;
}

/**
 * Audit V4: Atomically removes or re-parents everything keyed by `categoryId`.
 * Wrapped in a single Dexie `rw` transaction so a mid-flight failure rolls back
 * ALL changes (no partial orphans).
 *
 * This now includes cards and sources to avoid transaction fragmentation.
 */
export async function cascadeDeleteCategoryDomains(
  categoryId: string,
  opts: { purgeCards: boolean; fallbackId: string }
): Promise<CascadeResult> {
  if (!categoryId) {
    return {
      articles: 0, mindMaps: 0, mnemonics: 0, settings: 0,
      plannerScrubbed: false, cardsAffected: 0, sourcesAffected: 0
    };
  }

  const result: CascadeResult = {
    articles: 0,
    mindMaps: 0,
    mnemonics: 0,
    settings: 0,
    plannerScrubbed: false,
    cardsAffected: 0,
    sourcesAffected: 0,
  };

  await db.transaction(
    "rw",
    [db.knowledgeBaseArticles, db.mindMaps, db.mnemonics, db.settings, db.cards, db.sources],
    async () => {
      // 1. Cards
      if (opts.purgeCards) {
        result.cardsAffected = await db.cards.where("categoryId").equals(categoryId).delete();
      } else if (opts.fallbackId) {
        result.cardsAffected = await db.cards.where("categoryId").equals(categoryId).modify({
          categoryId: opts.fallbackId,
          subcategoryId: undefined,
          chapterId: undefined,
          updatedAt: Date.now()
        });
      }

      // 2. Sources
      if (opts.purgeCards) {
        result.sourcesAffected = await db.sources.where("categoryId").equals(categoryId).delete();
      } else if (opts.fallbackId) {
        result.sourcesAffected = await db.sources.where("categoryId").equals(categoryId).modify({
          categoryId: opts.fallbackId
        });
      }

      // 3. Zettelkasten articles (key: subjectId === categoryId)
      result.articles = await db.knowledgeBaseArticles
        .where("subjectId")
        .equals(categoryId)
        .delete();

      // 4. Mind maps
      result.mindMaps = await db.mindMaps
        .where("categoryId")
        .equals(categoryId)
        .delete();

      // 5. Mnemonics
      result.mnemonics = await db.mnemonics
        .where("categoryId")
        .equals(categoryId)
        .delete();

      // 6. Per-subject settings (keyed by `subject_settings:<categoryId>`)
      const settingsKey = SUBJECT_SETTINGS_PREFIX + categoryId;
      const existed = await db.settings.get(settingsKey);
      if (existed) {
        await db.settings.delete(settingsKey);
        result.settings = 1;
      }

      // 7. Scrub planner config refs.
      const plannerRow = await db.settings.get("plannerConfig");
      if (plannerRow?.value && typeof plannerRow.value === "object") {
        const cfg = { ...(plannerRow.value as PlannerConfigShape) };
        let dirty = false;

        if (Array.isArray(cfg.subjectOrder) && cfg.subjectOrder.includes(categoryId)) {
          cfg.subjectOrder = cfg.subjectOrder.filter(id => id !== categoryId);
          dirty = true;
        }
        if (Array.isArray(cfg.hardSubjects) && cfg.hardSubjects.includes(categoryId)) {
          cfg.hardSubjects = cfg.hardSubjects.filter(id => id !== categoryId);
          dirty = true;
        }
        if (Array.isArray(cfg.phases)) {
          cfg.phases = cfg.phases.map(ph => {
            if (Array.isArray(ph.categories) && ph.categories.includes(categoryId)) {
              dirty = true;
              return { ...ph, categories: ph.categories.filter(id => id !== categoryId) };
            }
            return ph;
          });
        }

        if (dirty) {
          await db.settings.put({ key: "plannerConfig", value: cfg });
          result.plannerScrubbed = true;
        }
      }
    },
  );

  // ── Post-commit: invalidate in-memory caches & subscriptions ──
  if (result.mindMaps > 0) invalidateMindMapsCache();
  if (result.settings > 0) clearSubjectSettings(categoryId);
  invalidateExaminerProfile(categoryId);
  backlinkIndex.clear(categoryId);
  // Sources/Cards are mutated; refresh subscribers afterwards.
  invalidateSourcesCache();

  return result;
}
