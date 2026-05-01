import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import type { MindMapDoc } from "@/lib/db";
import MindMapList from "@/components/mindmap/MindMapList";
import MindMapCanvas from "@/components/mindmap/MindMapCanvas";
import { hasSeenOnboarding } from "@/components/mindmap/MindMapOnboarding";
import { loadMindMaps } from "@/lib/mindmap-storage";
import { ArrowLeft } from "lucide-react";

export default function SubjectMindMapPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeDoc, setActiveDoc] = useState<MindMapDoc | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(() => !hasSeenOnboarding());

  // Auto-open a mind map when arriving with ?open={id}
  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId || activeDoc) return;
    let cancelled = false;
    loadMindMaps().then(all => {
      if (cancelled) return;
      const target = all.find(d => d.id === openId);
      if (target) {
        setActiveDoc(target);
        // Strip the param so back navigation behaves naturally.
        const next = new URLSearchParams(searchParams);
        next.delete("open");
        setSearchParams(next, { replace: true });
      }
    });
    return () => { cancelled = true; };
  }, [searchParams, activeDoc, setSearchParams]);

  if (activeDoc) {
    return (
      <div className="h-[calc(100vh-3rem)]">
        <MindMapCanvas doc={activeDoc} onBack={() => setActiveDoc(null)} />
      </div>
    );
  }

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
      <MindMapList
        onOpen={setActiveDoc}
        showOnboarding={showOnboarding}
        onShowOnboarding={() => setShowOnboarding(true)}
        onCloseOnboarding={() => setShowOnboarding(false)}
      />
    </div>
  );
}
