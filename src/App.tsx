import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { SessionProvider } from "@/contexts/SessionContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import MainLayout from "@/components/MainLayout";
import ProcessingOverlay from "@/components/ProcessingOverlay";
import { lazy, Suspense } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import NotFound from "./pages/NotFound";

// Retry wrapper for lazy imports — handles stale Vite module URLs after HMR
function lazyRetry<T extends { default: React.ComponentType<any> }>(
  factory: () => Promise<T>,
): React.LazyExoticComponent<T["default"]> {
  return lazy(() =>
    factory().catch(() => {
      // Module fetch failed (stale URL) — reload page once
      const key = "lazyRetryReloaded";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
      sessionStorage.removeItem(key);
      return factory();
    }),
  );
}

// Lazy-loaded route pages
const DashboardPage = lazyRetry(() => import("@/views/DashboardPage"));
const ReviewPage = lazyRetry(() => import("@/views/ReviewPage"));
const LearnPage = lazyRetry(() => import("@/views/LearnPage"));
const CreatePage = lazyRetry(() => import("@/views/CreatePage"));
const EditPage = lazyRetry(() => import("@/views/EditPage"));
const SettingsPage = lazyRetry(() => import("@/views/SettingsPage"));
const StatsPage = lazyRetry(() => import("@/views/StatsPage"));
const MnemonicPage = lazyRetry(() => import("@/views/MnemonicPage"));
const PlannerPage = lazyRetry(() => import("@/views/PlannerPage"));
const KnowledgeMapPage = lazyRetry(() => import("@/views/KnowledgeMapPage"));
const MetacognitivePage = lazyRetry(() => import("@/views/MetacognitivePage"));
const FrequentErrorsPage = lazyRetry(() => import("@/views/FrequentErrorsPage"));
const MajorSystemPage = lazyRetry(() => import("@/views/MajorSystemPage"));
const DatabasePage = lazyRetry(() => import("@/views/DatabasePage"));
const SpeedReaderPage = lazyRetry(() => import("@/views/SpeedReaderPage"));
const MindMapPage = lazyRetry(() => import("@/views/MindMapPage"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <div>
        <Toaster />
        <Sonner />
        <HashRouter>
          <AppProvider>
            <SessionProvider>
              <ErrorBoundary>
                <MainLayout>
                  <Suspense fallback={<PageSkeleton />}>
                    <Routes>
                      <Route path="/" element={<DashboardPage />} />
                      <Route path="/review" element={<ReviewPage />} />
                      <Route path="/learn" element={<LearnPage />} />
                      <Route path="/create" element={<CreatePage />} />
                      <Route path="/edit" element={<EditPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/stats" element={<StatsPage />} />
                      <Route path="/mnemonic" element={<MnemonicPage />} />
                      <Route path="/planner" element={<PlannerPage />} />
                      <Route path="/knowledge-map" element={<KnowledgeMapPage />} />
                      <Route path="/metacognitive" element={<MetacognitivePage />} />
                      <Route path="/frequent-errors" element={<FrequentErrorsPage />} />
                      <Route path="/major-system-settings" element={<MajorSystemPage />} />
                      <Route path="/database" element={<DatabasePage />} />
                      <Route path="/speed-reader" element={<SpeedReaderPage />} />
                      <Route path="/mind-map" element={<MindMapPage />} />
                      {/* Legacy redirects */}
                      <Route path="/cards" element={<DatabasePage />} />
                      <Route path="/categories" element={<DatabasePage />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </MainLayout>
                <ProcessingOverlay />
              </ErrorBoundary>
            </SessionProvider>
          </AppProvider>
        </HashRouter>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
