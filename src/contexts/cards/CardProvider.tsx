import { Suspense, lazy, type ReactNode } from "react";
import { CategoryStateProvider } from "./CategoryStateProvider";
import { CardStateProvider, useDbError } from "./CardStateProvider";
import { CardActionsProvider } from "./CardActionsProvider";
import { CategoryActionsProvider } from "./CategoryActionsProvider";
import { BackupActionsProvider } from "./BackupActionsProvider";

const LazyDatabaseRecoveryPanel = lazy(() => import("@/components/DatabaseRecoveryPanel"));

// ─────────────────────────────────────────────────────────────
// Public hooks — focused re-exports, no merged shims.
// Components import directly from the right domain provider.
// ─────────────────────────────────────────────────────────────
export {
  useCardData,
  useReviewData,
  useCategoryStatsData,
  useSettingsActions,
} from "./CardStateProvider";
export { useCategoryData } from "./CategoryStateProvider";
export { useCardOnlyActions } from "./CardActionsProvider";
export { useCategoryActions } from "./CategoryActionsProvider";
export { useBackupActions } from "./BackupActionsProvider";

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
