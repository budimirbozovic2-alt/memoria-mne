import { useAppContext } from "@/contexts/AppContext";
import MainLayout from "@/components/MainLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AnimatePresence, motion } from "framer-motion";
import { lazy, Suspense } from "react";

// Lazy-loaded views
const Dashboard = lazy(() => import("@/components/Dashboard"));
const CardForm = lazy(() => import("@/components/CardForm"));
const ReviewSession = lazy(() => import("@/components/ReviewSession"));
const LearnSession = lazy(() => import("@/components/LearnSession"));
const CategoryManager = lazy(() => import("@/components/CategoryManager"));
const KnowledgeMap = lazy(() => import("@/components/KnowledgeMap"));
const SRSettingsPanel = lazy(() => import("@/components/SRSettingsPanel"));
const MnemonicModule = lazy(() => import("@/components/MnemonicModule"));
const MetacognitiveCenter = lazy(() => import("@/components/MetacognitiveCenter"));
const MyStats = lazy(() => import("@/components/MyStats"));
const MajorSystemSettings = lazy(() => import("@/components/MajorSystemSettings"));
const StrategicPlanner = lazy(() => import("@/components/StrategicPlanner"));
const FrequentErrors = lazy(() => import("@/pages/FrequentErrors"));
const EmptyState = lazy(() => import("@/components/EmptyState"));
const CardsView = lazy(() => import("@/views/CardsView"));

const PageTransition = ({ children, viewKey }: { children: React.ReactNode; viewKey: string }) => (
  <motion.div key={viewKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    {children}
  </motion.div>
);

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-pulse text-muted-foreground text-sm">Učitavanje...</div>
  </div>
);

function ViewRouter() {
  const {
    view, setView,
    cards, categories, subcategories, dueCards, stats, categoryStats, cardCountByCategory, reviewLog, srSettings,
    addCard, addFlashCard, updateCard, deleteCard, reviewSection, markRead, logError, clearErrorLog,
    addCategory, renameCategory, deleteCategory,
    addSubcategory, renameSubcategory, deleteSubcategory,
    updateSRSettings, editingCard, setEditingCard,
    handleSendToWorkshop, handleToggleTag, exportData,
  } = useAppContext();

  return (
    <Suspense fallback={<LoadingFallback />}>
      <AnimatePresence mode="wait">
        {view === "dashboard" && (
          <PageTransition viewKey="dash">
            <ErrorBoundary>
              {cards.length === 0 ? (
                <EmptyState type="dashboard" onAction={() => setView("create")} />
              ) : (
                <Dashboard
                  stats={stats}
                  categoryStats={categoryStats}
                  categories={categories}
                  subcategories={subcategories}
                  cards={cards}
                  reviewLog={reviewLog}
                  srSettings={srSettings}
                  onExport={() => {}}
                  onStartReview={() => setView("review")}
                />
              )}
            </ErrorBoundary>
          </PageTransition>
        )}
        {view === "review" && (
          <PageTransition viewKey="review">
            <ErrorBoundary>
              {dueCards.length === 0 ? (
                <EmptyState type="review" />
              ) : (
                <ReviewSession
                  dueCards={dueCards}
                  subcategories={subcategories}
                  srSettings={srSettings}
                  onReviewSection={reviewSection}
                  onLogError={logError}
                  onBack={() => setView("dashboard")}
                />
              )}
            </ErrorBoundary>
          </PageTransition>
        )}
        {view === "learn" && (
          <PageTransition viewKey="learn">
            <ErrorBoundary>
              <LearnSession
                cards={cards}
                categories={categories}
                subcategories={subcategories}
                onMarkRead={markRead}
                onReviewSection={reviewSection}
                onBack={() => setView("dashboard")}
                dueCount={stats.due}
              />
            </ErrorBoundary>
          </PageTransition>
        )}
        {(view === "create" || view === "edit") && (
          <PageTransition viewKey="form">
            <ErrorBoundary>
              <CardForm
                categories={categories}
                subcategories={subcategories}
                onSave={(q, s, c, sub) => { addCard(q, s, c, sub); setView("cards"); }}
                onSaveFlash={(q, a, c, sub) => { addFlashCard(q, a, c, sub); setView("cards"); }}
                onCancel={() => { setView("dashboard"); setEditingCard(null); }}
                editCard={view === "edit" ? editingCard : null}
                onUpdate={(id, u) => { updateCard(id, u); setView("cards"); setEditingCard(null); }}
              />
            </ErrorBoundary>
          </PageTransition>
        )}
        {view === "categories" && (
          <PageTransition viewKey="categories">
            <ErrorBoundary>
              <CategoryManager
                categories={categories}
                subcategories={subcategories}
                cardCountByCategory={cardCountByCategory}
                onAdd={addCategory}
                onRename={renameCategory}
                onDelete={deleteCategory}
                onAddSub={addSubcategory}
                onRenameSub={renameSubcategory}
                onDeleteSub={deleteSubcategory}
                onClose={() => setView("dashboard")}
              />
            </ErrorBoundary>
          </PageTransition>
        )}
        {view === "settings" && (
          <PageTransition viewKey="settings">
            <ErrorBoundary>
              <SRSettingsPanel
                settings={srSettings}
                onUpdate={updateSRSettings}
                onBack={() => setView("dashboard")}
                onOpenMajorSystem={() => setView("major-system-settings")}
              />
            </ErrorBoundary>
          </PageTransition>
        )}
        {view === "frequent-errors" && (
          <PageTransition viewKey="errors">
            <ErrorBoundary>
              <FrequentErrors cards={cards} onBack={() => setView("dashboard")} onClearErrorLog={clearErrorLog} />
            </ErrorBoundary>
          </PageTransition>
        )}
        {view === "knowledge-map" && (
          <PageTransition viewKey="kmap">
            <ErrorBoundary>
              <KnowledgeMap cards={cards} categories={categories} subcategories={subcategories} onBack={() => setView("dashboard")} />
            </ErrorBoundary>
          </PageTransition>
        )}
        {view === "mnemonic" && (
          <PageTransition viewKey="mnemonic">
            <ErrorBoundary>
              <MnemonicModule onBack={() => setView("dashboard")} />
            </ErrorBoundary>
          </PageTransition>
        )}
        {view === "metacognitive" && (
          <PageTransition viewKey="metacognitive">
            <ErrorBoundary>
              <MetacognitiveCenter
                cards={cards}
                categories={categories}
                reviewLog={reviewLog}
                onBack={() => setView("stats")}
                settings={srSettings}
                onSendToWorkshop={handleSendToWorkshop}
              />
            </ErrorBoundary>
          </PageTransition>
        )}
        {view === "stats" && (
          <PageTransition viewKey="stats">
            <ErrorBoundary>
              <MyStats
                cards={cards}
                categories={categories}
                subcategories={subcategories}
                categoryStats={categoryStats}
                reviewLog={reviewLog}
                srSettings={srSettings}
                onBack={() => setView("dashboard")}
                onShowKnowledgeMap={() => setView("knowledge-map")}
                onShowPlanner={() => setView("planner")}
                onSendToWorkshop={handleSendToWorkshop}
              />
            </ErrorBoundary>
          </PageTransition>
        )}
        {view === "planner" && (
          <PageTransition viewKey="planner">
            <ErrorBoundary>
              <StrategicPlanner cards={cards} categories={categories} reviewLog={reviewLog} onBack={() => setView("dashboard")} />
            </ErrorBoundary>
          </PageTransition>
        )}
        {view === "major-system-settings" && (
          <PageTransition viewKey="major-settings">
            <ErrorBoundary>
              <MajorSystemSettings onBack={() => setView("settings")} />
            </ErrorBoundary>
          </PageTransition>
        )}
        {view === "cards" && (
          <PageTransition viewKey="cards">
            <ErrorBoundary>
              <CardsView />
            </ErrorBoundary>
          </PageTransition>
        )}
      </AnimatePresence>
    </Suspense>
  );
}

export default function Index() {
  return (
    <MainLayout>
      <ViewRouter />
    </MainLayout>
  );
}
