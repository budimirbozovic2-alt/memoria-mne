import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useCardOnlyActions } from "@/hooks/cards/useActions";
import { type Source } from "@/domains/sources/sources-storage";
import { useSourceReaderStore } from "@/store";
import { deriveTitleAndBody, splitSelection, type SelectionModule } from "@/lib/selection-split-engine";
import { sanitizeHtml } from "@/lib/sanitize";
import {
  buildCombinedEssayFromModules,
  buildEssayFromSelection,
  buildLinkPatch,
  type AddCardArgs,
} from "@/lib/source-reader/build-essay-payload";
import { buildPropisArticleFromSelection } from "@/lib/source-reader/build-propis-article";
import { buildLinkedProvision } from "@/lib/source-reader/build-linked-provision";
import { saveArticle, getArticle } from "@/domains/zettelkasten/zettelkasten-storage";
import { useKnowledgeBaseMutations } from "@/hooks/zettelkasten/useKnowledgeBaseMutations";
import { commitMappingCreated } from "@/lib/services/sourceEditingService";
import { usePlannerMutations } from "@/hooks/planner/usePlannerMutations";
import { logger } from "@/lib/logger";
import type { SelectionPayload } from "@/lib/source-reader/selection-payload";

type AddCardFn = ReturnType<typeof useCardOnlyActions>["addCard"];

function dispatchAdd(addCard: AddCardFn, a: AddCardArgs) {
  return addCard(a.question, a.sections, a.categoryId, a.subId, a.chapId, a.options);
}

/**
 * Selection→Essay mapping actions for the source reader. Pure orchestration:
 * builders live in `build-essay-payload`, side-effects in `commitMappingCreated`.
 *
 * BubbleMenu callers pass `SelectionPayload` directly. ExamSidebar mapping reads
 * the *current* TipTap selection via a parent-supplied getter
 * (`getSelectionPayload`) so we never reach into `window.getSelection()`.
 */
export function useSourceMapping(source: Source) {
  const { addCard, patchCard } = useCardOnlyActions();
  const { incrementMapped } = usePlannerMutations();
  const { save: saveArticleMutation } = useKnowledgeBaseMutations();
  const commitMapping = useCallback((count: number) => {
    if (count <= 0) return;
    incrementMapped.mutate(count);
    commitMappingCreated(count, { skipPlanner: true });
  }, [incrementMapped]);

  const handleConvertToEssay = useCallback((payload: SelectionPayload) => {
    const { text, html, contentDoc } = payload;
    const {
      setSplitResult, setSplitSummaryOpen, initSplitWizard,
    } = useSourceReaderStore.getState();
    if (!text || text.trim().length === 0) return;
    const safe = sanitizeHtml(html || `<p>${text}</p>`);

    const split = source.sourceKind !== "skripta" ? splitSelection(text) : null;
    if (split?.hasArticles && split.modules.length > 0) {
      setSplitResult({
        modules: split.modules,
        rangeLabel: split.rangeLabel,
        parentName: split.parentName,
      });
      initSplitWizard(split.modules, split.parentName);
      setSplitSummaryOpen(true);
      return;
    }

    const { title, contentText, contentHtml, contentDoc: strippedDoc } = deriveTitleAndBody(
      text, safe, contentDoc,
    );
    const singleModule: SelectionModule = {
      id: crypto.randomUUID(),
      articleNum: "",
      title,
      contentText,
      contentHtml,
      contentDoc: strippedDoc,
      plainSnippet: contentText,
    };
    setSplitResult({ modules: [singleModule], rangeLabel: title, parentName: title });
    initSplitWizard([singleModule], title);
    setSplitSummaryOpen(true);
  }, [source.sourceKind]);

  const handleSmartSplitConfirm = useCallback(async () => {
    const {
      splitResult, splitModules, splitEdits, splitParentName,
      wizardSubcategoryId, wizardChapterId,
      setSplitCreatedCount, setSplitDone,
    } = useSourceReaderStore.getState();
    if (!splitResult || splitModules.length === 0) return;
    const subId = wizardSubcategoryId || undefined;
    const chapId = wizardChapterId || undefined;

    const args = buildCombinedEssayFromModules(
      splitModules, splitEdits,
      splitParentName || splitResult.parentName,
      source, subId, chapId,
    );
    if (!args) {
      toast.error("Svi članovi su preskočeni — ništa za kreirati.");
      return;
    }
    try {
      await dispatchAdd(addCard, args);
    } catch {
      return;
    }
    const moduleCount = args.options?.sourceModules?.length ?? 1;
    setSplitCreatedCount(moduleCount);
    setSplitDone(true);
    commitMapping(moduleCount);
    toast.success(`Generisano 1 esej sa ${moduleCount} modula`, {
      description: `${splitResult.rangeLabel} iz "${source.title}"`,
    });
  }, [source, addCard, commitMapping]);

  const handleLinkToExisting = useCallback((payload: SelectionPayload) => {
    const { text, html, contentDoc } = payload;
    const { setLinkSelectedText, setLinkSelectedHtml, setLinkSelectedDoc, setLinkModalOpen } =
      useSourceReaderStore.getState();
    if (!text) return;
    setLinkSelectedText(text);
    setLinkSelectedHtml(html);
    setLinkSelectedDoc(contentDoc);
    setLinkModalOpen(true);
  }, []);

  const handleLinkConfirm = useCallback((cardId: string, appendSnippet: boolean = true) => {
    const {
      linkSelectedText, linkSelectedHtml, linkSelectedDoc,
      setLinkModalOpen, setLinkSelectedText, setLinkSelectedHtml, setLinkSelectedDoc,
    } = useSourceReaderStore.getState();
    patchCard(cardId, (c) => buildLinkPatch(
      c, linkSelectedText, linkSelectedHtml, source.id, appendSnippet, linkSelectedDoc ?? undefined,
    ));
    setLinkModalOpen(false);
    setLinkSelectedText("");
    setLinkSelectedHtml("");
    setLinkSelectedDoc(null);
    toast.success("Esej uspješno povezan!", { description: `Povezano sa izvorom "${source.title}"` });
  }, [patchCard, source.id, source.title]);

  const handleMapSelection = useCallback(async (
    questionId: string,
    payload: SelectionPayload | null,
  ) => {
    const { examQuestions, setExamQuestions } = useSourceReaderStore.getState();
    if (!payload || !payload.text) return;
    const question = examQuestions.find((q) => q.id === questionId);
    if (!question) return;
    const result = buildEssayFromSelection(
      payload.text, payload.html, question.text, source, payload.contentDoc,
    );
    try {
      await dispatchAdd(addCard, result.args);
    } catch {
      return;
    }
    setExamQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, done: true, moduleCount: result.moduleCount } : q)),
    );
    commitMapping(result.moduleCount);
    if (result.moduleCount > 1 && result.rangeLabel) {
      toast.success(`Esej kreiran: ${result.moduleCount} modula`, {
        description: `${result.rangeLabel} → "${question.text.slice(0, 50)}..."`,
      });
    } else {
      toast.success("Esej kreiran", { description: `"${question.text.slice(0, 60)}..."` });
    }
  }, [source, addCard, commitMapping]);

  // Faza 1: izvuci selekciju iz izvora u NOVI zettelkasten članak kao propis
  // blok (kopija sa tragom). Blic i dalje ide preko autosplita (§2b plana).
  const handleExtractToArticle = useCallback(async (payload: SelectionPayload) => {
    if (!payload.text || payload.text.trim().length === 0) return;
    try {
      const article = buildPropisArticleFromSelection(payload, source);
      await saveArticle(article);
      toast.success("Propis izvučen u novi članak", {
        description: `„${article.title}" — dopiši teoriju u zettelkastenu.`,
      });
    } catch (err) {
      logger.error("[useSourceMapping] extractToArticle failed", err);
      toast.error("Izvlačenje u članak nije uspjelo", { description: "Pokušajte ponovo." });
    }
  }, [source]);

  // Poveži selekciju propisa sa POSTOJEĆIM člankom — samo referenca
  // (sourceId + anchor), bez ugrađivanja teksta u contentDoc. Otvara picker;
  // stvarno vezivanje se dešava u handleLinkProvisionConfirm.
  const handleLinkToExistingArticle = useCallback((payload: SelectionPayload) => {
    const { text, html } = payload;
    const {
      setProvisionLinkSelectedText, setProvisionLinkSelectedHtml, setProvisionLinkModalOpen,
    } = useSourceReaderStore.getState();
    if (!text) return;
    setProvisionLinkSelectedText(text);
    setProvisionLinkSelectedHtml(html);
    setProvisionLinkModalOpen(true);
  }, []);

  const handleLinkProvisionConfirm = useCallback(async (articleId: string) => {
    const {
      provisionLinkSelectedText,
      setProvisionLinkModalOpen, setProvisionLinkSelectedText, setProvisionLinkSelectedHtml,
    } = useSourceReaderStore.getState();
    if (!provisionLinkSelectedText) return;
    try {
      const article = await getArticle(articleId);
      if (!article) throw new Error(`Article ${articleId} not found`);
      const provision = buildLinkedProvision({ text: provisionLinkSelectedText }, source.id);
      const updated = {
        ...article,
        linkedProvisions: [...(article.linkedProvisions ?? []), provision],
      };
      await saveArticleMutation.mutateAsync(updated);
      toast.success("Propis povezan sa člankom", {
        description: `„${article.title}" — pogledaj u panelu "Propisi" unutar članka.`,
      });
    } catch (err) {
      logger.error("[useSourceMapping] linkProvisionConfirm failed", err);
      toast.error("Povezivanje nije uspjelo", { description: "Pokušajte ponovo." });
    } finally {
      setProvisionLinkModalOpen(false);
      setProvisionLinkSelectedText("");
      setProvisionLinkSelectedHtml("");
    }
  }, [source.id, saveArticleMutation]);

  return useMemo(() => ({
    handleConvertToEssay,
    handleSmartSplitConfirm,
    handleLinkToExisting,
    handleLinkConfirm,
    handleMapSelection,
    handleExtractToArticle,
    handleLinkToExistingArticle,
    handleLinkProvisionConfirm,
  }), [
    handleConvertToEssay,
    handleSmartSplitConfirm,
    handleLinkToExisting,
    handleLinkConfirm,
    handleMapSelection,
    handleExtractToArticle,
    handleLinkToExistingArticle,
    handleLinkProvisionConfirm,
  ]);
}
