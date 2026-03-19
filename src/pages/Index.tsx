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

/** View-level ErrorBoundary with "go home" navigation */
function ViewBoundary({ children, label }: { children: React.ReactNode; label: string }) {
  const { setView } = useAppContext();
  return (
    <ErrorBoundary label={label} onNavigateHome={() => setView("dashboard")}>
      {children}
    </ErrorBoundary>
  );
}

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
            <ViewBoundary label="Dashboard">
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
            </ViewBoundary>
          </PageTransition>
        )}
        {view === "review" && (
          <PageTransition viewKey="review">
            <ViewBoundary label="Ponavljanje">
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
            </ViewBoundary>
          </PageTransition>
        )}
        {view === "learn" && (
          <PageTransition viewKey="learn">
            <ViewBoundary label="Učenje">
              <LearnSession
                cards={cards}
                categories={categories}
                subcategories={subcategories}
                onMarkRead={markRead}
                onReviewSection={reviewSection}
                onBack={() => setView("dashboard")}
                dueCount={stats.due}
              />
            </ViewBoundary>
          </PageTransition>
        )}
        {(view === "create" || view === "edit") && (
          <PageTransition viewKey="form">
            <ViewBoundary label="Forma za kartice">
              <CardForm
                categories={categories}
                subcategories={subcategories}
                onSave={(q, s, c, sub) => { addCard(q, s, c, sub); setView("cards"); }}
                onSaveFlash={(q, a, c, sub) => { addFlashCard(q, a, c, sub); setView("cards"); }}
                onCancel={() => { setView("dashboard"); setEditingCard(null); }}
                editCard={view === "edit" ? editingCard : null}
                onUpdate={(id, u) => { updateCard(id, u); setView("cards"); setEditingCard(null); }}
              />
            </ViewBoundary>
          </PageTransition>
        )}
        {view === "categories" && (
          <PageTransition viewKey="categories">
            <ViewBoundary label="Kategorije">
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
            </ViewBoundary>
          </PageTransition>
        )}
        {view === "settings" && (
          <PageTransition viewKey="settings">
            <ViewBoundary label="Podešavanja">
              <SRSettingsPanel
                settings={srSettings}
                onUpdate={updateSRSettings}
                onBack={() => setView("dashboard")}
                onOpenMajorSystem={() => setView("major-system-settings")}
              />
            </ViewBoundary>
          </PageTransition>
        )}
        {view === "frequent-errors" && (
          <PageTransition viewKey="errors">
            <ViewBoundary label="Česte greške">
              <FrequentErrors cards={cards} onBack={() => setView("dashboard")} onClearErrorLog={clearErrorLog} />
            </ViewBoundary>
          </PageTransition>
        )}
        {view === "knowledge-map" && (
          <PageTransition viewKey="kmap">
            <ViewBoundary label="Mapa znanja">
              <KnowledgeMap cards={cards} categories={categories} subcategories={subcategories} onBack={() => setView("dashboard")} />
            </ViewBoundary>
          </PageTransition>
        )}
        {view === "mnemonic" && (
          <PageTransition viewKey="mnemonic">
            <ViewBoundary label="Memo radionica">
              <MnemonicModule onBack={() => setView("dashboard")} />
            </ViewBoundary>
          </PageTransition>
        )}
        {view === "metacognitive" && (
          <PageTransition viewKey="metacognitive">
            <ViewBoundary label="Metakognicija">
              <MetacognitiveCenter
                cards={cards}
                categories={categories}
                reviewLog={reviewLog}
                onBack={() => setView("stats")}
                settings={srSettings}
                onSendToWorkshop={handleSendToWorkshop}
              />
            </ViewBoundary>
          </PageTransition>
        )}
        {view === "stats" && (
          <PageTransition viewKey="stats">
            <ViewBoundary label="Statistike">
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
            </ViewBoundary>
          </PageTransition>
        )}
        {view === "planner" && (
          <PageTransition viewKey="planner">
            <ViewBoundary label="Planer">
              <StrategicPlanner cards={cards} categories={categories} reviewLog={reviewLog} onBack={() => setView("dashboard")} />
            </ViewBoundary>
          </PageTransition>
        )}
        {view === "major-system-settings" && (
          <PageTransition viewKey="major-settings">
            <ViewBoundary label="Major System">
              <MajorSystemSettings onBack={() => setView("settings")} />
            </ViewBoundary>
          </PageTransition>
        )}
        {view === "cards" && (
          <PageTransition viewKey="cards">
            <ViewBoundary label="Kartice">
              <CardsView />
            </ViewBoundary>
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
