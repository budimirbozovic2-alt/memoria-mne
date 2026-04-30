import { Suspense, lazy, useMemo, type ReactNode } from "react";
import { CategoryStateProvider, useCategoryDataInternal } from "./CategoryStateProvider";
import {
  CardStateProvider,
  useCardData,
  useReviewData,
  useDbError,
  useCategoryStatsData,
  useCardStateInternals,
} from "./CardStateProvider";
import { CardActionsProvider, useCardOnlyActions } from "./CardActionsProvider";
import { CategoryActionsProvider, useCategoryActions } from "./CategoryActionsProvider";
import { BackupActionsProvider, useBackupActions } from "./BackupActionsProvider";

const LazyDatabaseRecoveryPanel = lazy(() => import("@/components/DatabaseRecoveryPanel"));

// ─────────────────────────────────────────────────────────────
// Public hooks (back-compat surface)
// ─────────────────────────────────────────────────────────────
export { useCardData, useReviewData };
export { useCategoryActions, useBackupActions };

/**
 * Back-compat: combines public category list + card-derived `categoryStats`
 * into the historical shape so existing 26 consumers don't change.
 */
export function useCategoryData() {
  const base = useCategoryDataInternal();
  const { categoryStats } = useCategoryStatsData();
  return useMemo(
    () => ({ ...base, categoryStats }),
    [base, categoryStats],
  );
}

/**
 * Back-compat: merged actions object that mirrors the historical 30-key API.
 * No Proxy — each underlying actions context already returns a stable
 * `useMemo`-wrapped value, so the merged identity is stable too.
 */
export function useCardActions() {
  const card = useCardOnlyActions();
  const category = useCategoryActions();
  const backup = useBackupActions();
  const { updateSRSettings } = useCardStateInternals();
  return useMemo(
    () => ({ ...card, ...category, ...backup, updateSRSettings }),
    [card, category, backup, updateSRSettings],
  );
}

// ─────────────────────────────────────────────────────────────
// Composition root
// ─────────────────────────────────────────────────────────────
function RecoveryGate({ children }: { children: ReactNode }) {
  const dbError = useDbError();
  if (dbError) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-muted-foreground">Učitavanje...</div>}>
        <LazyDatabaseRecoveryPanel error={dbError} />
      </Suspense>
    );
  }
  return <>{children}</>;
}

export function CardProvider({ children }: { children: ReactNode }) {
  return (
    <CategoryStateProvider>
      <CardStateProvider>
        <CardActionsProvider>
          <CategoryActionsProvider>
            <BackupActionsProvider>
              <RecoveryGate>{children}</RecoveryGate>
            </BackupActionsProvider>
          </CategoryActionsProvider>
        </CardActionsProvider>
      </CardStateProvider>
    </CategoryStateProvider>
  );
}
