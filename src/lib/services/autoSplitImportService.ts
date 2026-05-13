/**
 * Auto-Split Import Service — sole owner of side-effects for auto-split.
 *
 * Wraps `bulkAddCards` / `updateCard`, drains the persist queue, and verifies
 * the IDB card count post-write. The hook only sees a clean Promise<ImportResult>.
 */
import { persistQueue } from "@/lib/persist-queue";
import { db } from "@/lib/db";
import type { Card } from "@/lib/spaced-repetition";
import type { ImportPlan, CardUpdatePatch } from "@/lib/auto-split/import-planner";

export interface ExecuteDeps {
  bulkAddCards: (cards: Card[]) => void;
  updateCard: (id: string, patch: CardUpdatePatch) => void;
  onProgress?: (pct: number) => void;
}

export interface ImportResult {
  created: number;
  updated: number;
  total: number;
  idbCount: number;
}

export async function executeImportPlan(
  plan: ImportPlan,
  deps: ExecuteDeps,
): Promise<ImportResult> {
  deps.onProgress?.(10);
  if (plan.toCreate.length > 0) deps.bulkAddCards(plan.toCreate);
  for (const u of plan.toUpdate) deps.updateCard(u.id, u.patch);
  deps.onProgress?.(50);
  await persistQueue.flush();
  const idbCount = await db.cards.count();
  deps.onProgress?.(100);
  return {
    created: plan.toCreate.length,
    updated: plan.toUpdate.length,
    total: plan.toCreate.length + plan.toUpdate.length,
    idbCount,
  };
}
