import { useState, lazy, Suspense } from "react";
import { useParams, Link } from "react-router-dom";
import SpeedReader from "@/components/SpeedReader";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";

const SpeedReaderOnboarding = lazy(() => import("@/components/SpeedReaderOnboarding"));

export default function SubjectSpeedReaderPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <div>
      <div className="mb-3">
        <Link
          to={`/subject/${categoryId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Nazad na predmet
        </Link>
      </div>
      <SpeedReader onShowOnboarding={() => setShowOnboarding(true)} initialCategoryId={categoryId} />
      <AnimatePresence>
        {showOnboarding && (
          <Suspense fallback={null}>
            <SpeedReaderOnboarding onComplete={() => setShowOnboarding(false)} />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}
