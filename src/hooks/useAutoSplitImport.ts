/**
 * Orchestration hook for AutoSplitDialog.
 *
 * Owns: dialog phase + selection reducer + merge dialog state. Delegates
 * domain to `import-planner` and I/O to `autoSplitImportService`. UI stays dumb.
 */
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { toast } from "sonner";
import { useCardOnlyActions } from "@/hooks/cards/useActions";
import { useCardsBySource } from "@/store";
import { useCategoryData } from "@/hooks/cards/useCategoryState";
import { detectArticles, type ChapterHeadingType } from "@/lib/auto-split-engine";
import { deriveHtml } from "@/lib/editor-v4/derived";
import type { Source } from "@/domains/sources/sources-storage";
import type { SubcategoryNode } from "@/lib/db-types";
import {
  buildArticleRows, mergeRows, ungroupRow, buildImportPlan, collectMissingChapterNames,
  type ArticleRow, type ChapterAssignment,
} from "@/lib/auto-split/import-planner";
import { executeImportPlan } from "@/lib/services/autoSplitImportService";
import { categoryRepository } from "@/lib/repositories";
import { newUuid } from "@/lib/ids";
import type { ChapterNode } from "@/lib/db-types";

import { logger } from "@/lib/logger";
export type AutoSplitPhase = "preview" | "importing" | "done";

interface RowsState { rows: ArticleRow[] }
type RowsAction =
  | { type: "set"; rows: ArticleRow[] }
  | { type: "toggle"; idx: number }
  | { type: "toggleAll" }
  | { type: "merge"; indices: number[]; name: string }
  | { type: "ungroup"; idx: number }
  | { type: "updateChapterHeadings"; headingByArticleNum: ReadonlyMap<string, string | null | undefined> };

function rowsReducer(state: RowsState, action: RowsAction): RowsState {
  switch (action.type) {
    case "set":
      return { rows: action.rows };
    case "toggle":
      return {
        rows: state.rows.map((r, i) => (i === action.idx ? { ...r, selected: !r.selected } : r)),
      };
    case "toggleAll": {
      const allSelected = state.rows.every((r) => r.selected);
      return { rows: state.rows.map((r) => ({ ...r, selected: !allSelected })) };
    }
    case "merge":
      return { rows: mergeRows(state.rows, action.indices, action.name) };
    case "ungroup":
      return { rows: ungroupRow(state.rows, action.idx) };
    case "updateChapterHeadings":
      // In-place metadata refresh only — row structure (merges, selections,
      // exists status) is untouched, unlike "set" which rebuilds everything.
      return {
        rows: state.rows.map((r) => ({
          ...r,
          articles: r.articles.map((art) => ({
            ...art,
            chapterHeadingText: action.headingByArticleNum.get(art.articleNum),
          })),
        })),
      };
  }
}

export function useAutoSplitImport(open: boolean, source: Source) {
  const { bulkAddCards, updateCard } = useCardOnlyActions();

  const [phase, setPhase] = useState<AutoSplitPhase>("preview");
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [mergeNameDialog, setMergeNameDialog] = useState(false);
  const [mergeName, setMergeName] = useState("");

  // Optional glava (chapter) auto-assignment — propis-only (§ user decision,
  // gated in the dialog by sourceKind !== "skripta"). Off by default; the
  // user picks BOTH which structural marker to treat as the chapter boundary
  // (laws differ in terminology) and the single target subcategory to scope
  // the (existing-only) chapter lookup within.
  const [chapterAssignEnabled, setChapterAssignEnabled] = useState(false);
  const [chapterHeadingType, setChapterHeadingType] = useState<ChapterHeadingType | "">("");
  const [targetSubcategoryId, setTargetSubcategoryId] = useState("");
  // Opt-in: create glave that don't exist yet in the target subcategory from
  // the detected headings, so the taxonomy can be built straight from the
  // document instead of requiring every chapter to be pre-created by hand.
  const [createMissingChapters, setCreateMissingChapters] = useState(false);

  const { categoryRecords } = useCategoryData();
  const subcategories: SubcategoryNode[] = useMemo(
    () => categoryRecords.find((r) => r.id === source.categoryId)?.subcategories ?? [],
    [categoryRecords, source.categoryId],
  );
  const targetSubcategory = useMemo(
    () => subcategories.find((s) => s.id === targetSubcategoryId),
    [subcategories, targetSubcategoryId],
  );

  const effectiveChapterHeadingType = chapterAssignEnabled && chapterHeadingType ? chapterHeadingType : undefined;

  // Stable base parse — deliberately NOT keyed on `effectiveChapterHeadingType`.
  // Article boundaries/titles/content never depend on the chosen heading type,
  // so toggling "Dodijeli glave automatski" or switching the heading type
  // must not rebuild this (see the `updateChapterHeadings` effect below,
  // which is what actually reacts to that setting).
  // PR-7c (M3 #8): derive HTML from contentDoc — legacy htmlContent dropped.
  const baseDetected = useMemo(
    () => (open ? detectArticles(deriveHtml(source.contentDoc)) : []),
    [open, source.contentDoc],
  );

  // Recomputed only when the chosen heading type changes. Re-parsing here is
  // cheap relative to a full rows rebuild, and keeps this lookup decoupled
  // from `baseDetected` so it can be merged into already-built rows in place
  // instead of triggering a full "set" that would wipe merges/selections.
  const chapterHeadingByArticleNum = useMemo(() => {
    if (!open || !effectiveChapterHeadingType) return null;
    const withHeadings = detectArticles(deriveHtml(source.contentDoc), effectiveChapterHeadingType);
    return new Map(withHeadings.map((a) => [a.articleNum, a.chapterHeadingText]));
  }, [open, source.contentDoc, effectiveChapterHeadingType]);

  // Granular selector — re-renders only when cards linked to THIS source
  // change. The defensive `phase === "preview"` guard below remains, but it
  // is now belt-and-suspenders rather than a load-bearing workaround.
  const linkedCards = useCardsBySource(source.id);

  const [state, dispatch] = useReducer(rowsReducer, { rows: [] });

  // Full reset only when the dialog opens or the source changes — NOT on
  // every cards mutation (otherwise a successful import would flip the UI
  // from "done" back to "preview" the moment bulkAddCards updates context).
  useEffect(() => {
    if (!open) return;
    dispatch({ type: "set", rows: buildArticleRows(baseDetected, linkedCards) });
    setPhase("preview");
    setProgress(0);
    setImportedCount(0);
    setMergeNameDialog(false);
    // Reason: dialog state is reseeded only when it opens or the source changes;
    // `baseDetected`/`linkedCards` are read intentionally as a snapshot to avoid
    // re-resetting the preview while the user is editing rows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, source.id]);

  // Refresh row "exists" status when linked cards change, but only while
  // the user is still in the preview phase (don't disturb importing/done).
  useEffect(() => {
    setPhase((p) => {
      if (p === "preview") {
        dispatch({ type: "set", rows: buildArticleRows(baseDetected, linkedCards) });
      }
      return p;
    });
  }, [baseDetected, linkedCards]);

  // Chapter-assign settings (toggle / heading type) changed — refresh just
  // the `chapterHeadingText` metadata on existing rows, in place. Unlike the
  // effect above, this must NOT rebuild `rows`, or every merge/selection the
  // user made in this preview session would be silently discarded.
  useEffect(() => {
    if (phase !== "preview" || !chapterHeadingByArticleNum) return;
    dispatch({ type: "updateChapterHeadings", headingByArticleNum: chapterHeadingByArticleNum });
  }, [phase, chapterHeadingByArticleNum]);

  const rows = state.rows;
  const selectedIndices = useMemo(
    () => rows.map((r, i) => (r.selected ? i : -1)).filter((i) => i >= 0),
    [rows],
  );
  const selectedCount = selectedIndices.length;
  const canMerge = selectedCount >= 2;

  const counts = useMemo(() => ({
    newCount: rows.filter((r) => r.status === "new").length,
    existsCount: rows.filter((r) => r.status === "exists").length,
    groupCount: rows.filter((r) => r.isGroup).length,
  }), [rows]);

  const toggleRow = useCallback((idx: number) => dispatch({ type: "toggle", idx }), []);
  const toggleAll = useCallback(() => dispatch({ type: "toggleAll" }), []);
  const ungroup = useCallback((idx: number) => dispatch({ type: "ungroup", idx }), []);

  const openMergeDialog = useCallback(() => {
    if (!canMerge) return;
    const first = rows[selectedIndices[0]];
    const nums = selectedIndices
      .map((i) => rows[i].articles.map((a) => a.articleNum).join(","))
      .join(", ");
    setMergeName(first.groupName || `Čl. ${nums}`);
    setMergeNameDialog(true);
  }, [canMerge, rows, selectedIndices]);

  const closeMergeDialog = useCallback(() => setMergeNameDialog(false), []);

  const confirmMerge = useCallback(() => {
    const name = mergeName.trim();
    if (!name) return;
    dispatch({ type: "merge", indices: selectedIndices, name });
    setMergeNameDialog(false);
  }, [mergeName, selectedIndices]);

  const startImport = useCallback(async () => {
    let chapterAssignment: ChapterAssignment | undefined;
    let createdChapters = 0;
    if (chapterAssignEnabled && targetSubcategory) {
      let chapters = targetSubcategory.chapters;
      // Optional pre-step: materialize glave that don't exist yet so every
      // detected heading has something to match against. Runs before the plan
      // is built; the freshly-persisted chapter list is then handed to it.
      if (createMissingChapters) {
        const missing = collectMissingChapterNames(rows, chapters);
        if (missing.length > 0) {
          const startOrder = chapters.length;
          const newChapters: ChapterNode[] = missing.map((name, i) => ({
            id: newUuid(), name, sortOrder: startOrder + i,
          }));
          const updated = await categoryRepository.commit(
            (prev) => prev.map((r) =>
              r.id !== source.categoryId ? r : {
                ...r,
                subcategories: (r.subcategories ?? []).map((s) =>
                  s.id === targetSubcategory.id
                    ? { ...s, chapters: [...s.chapters, ...newChapters] }
                    : s,
                ),
              }),
            "autoSplitCreateChapters",
          );
          chapters =
            updated.find((c) => c.id === source.categoryId)
              ?.subcategories.find((s) => s.id === targetSubcategory.id)?.chapters
            ?? [...chapters, ...newChapters];
          createdChapters = newChapters.length;
        }
      }
      chapterAssignment = { subcategoryId: targetSubcategory.id, chapters };
    }
    const plan = buildImportPlan(rows, source, chapterAssignment);
    if (plan.toCreate.length === 0 && plan.toUpdate.length === 0) return;
    setPhase("importing");
    setProgress(0);
    const result = await executeImportPlan(plan, {
      bulkAddCards,
      updateCard,
      onProgress: setProgress,
    });
    if (import.meta.env.DEV) {
      logger.log(
        `[AutoSplit] created=${result.created} updated=${result.updated} idbTotal=${result.idbCount} newChapters=${createdChapters}`,
      );
    }
    setImportedCount(result.total);
    setPhase("done");
    const description = createdChapters > 0
      ? `Iz izvora "${source.title}" • kreirano ${createdChapters} novih glava`
      : `Iz izvora "${source.title}"`;
    toast.success(`Generisano ${result.total} eseja`, { description });
  }, [rows, source, bulkAddCards, updateCard, chapterAssignEnabled, targetSubcategory, createMissingChapters]);

  return {
    phase, progress, importedCount,
    detected: baseDetected, rows, selectedCount, canMerge, counts, selectedIndices,
    toggleRow, toggleAll, ungroup,
    mergeNameDialog, mergeName, setMergeName,
    openMergeDialog, closeMergeDialog, confirmMerge,
    startImport,
    chapterAssignEnabled, setChapterAssignEnabled,
    chapterHeadingType, setChapterHeadingType,
    targetSubcategoryId, setTargetSubcategoryId,
    createMissingChapters, setCreateMissingChapters,
    subcategories,
  };
}
