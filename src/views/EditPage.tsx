import { useCardContext, useUIContext, type View } from "@/contexts/AppContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import CardForm from "@/components/CardForm";
import { useEffect, useRef } from "react";
import type { Card } from "@/lib/spaced-repetition";

export default function EditPage() {
  const { categories, subcategories, categoryRecords, updateCard } = useCardContext();
  const { setView, editingCard, setEditingCard } = useUIContext();
  const previousViewRef = useRef<View | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("sr-edit-return-view");
    if (stored) previousViewRef.current = stored as View;
  }, []);

  const handleCancel = () => {
    const returnTo = previousViewRef.current || "cards";
    setEditingCard(null);
    sessionStorage.removeItem("sr-edit-return-view");
    setView(returnTo);
  };

  const handleUpdate = (id: string, u: Partial<Card>) => {
    updateCard(id, u);
    setEditingCard(null);
    const returnTo = previousViewRef.current || "cards";
    sessionStorage.removeItem("sr-edit-return-view");
    setView(returnTo);
  };

  return (
    <ErrorBoundary label="Uredi karticu" onNavigateHome={() => setView("dashboard")}>
      <CardForm
        categories={categories}
        subcategories={subcategories}
        categoryRecords={categoryRecords}
        onSave={() => {}}
        onSaveFlash={() => {}}
        onCancel={handleCancel}
        editCard={editingCard}
        onUpdate={handleUpdate}
      />
    </ErrorBoundary>
  );
}
