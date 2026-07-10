import { Navigate, useLocation } from "react-router-dom";
import SubjectsTab from "@/components/settings/SubjectsTab";
import SettingsSectionLayout from "@/components/settings/SettingsSectionLayout";
import { useSettingsContext } from "@/components/settings/SettingsContext";

export default function SettingsSubjectsView() {
  const {
    isSubjectMode,
    categories,
    subcategories,
    categoryRecords,
    cardCountByCategory,
    addCategory,
    renameCategory,
    deleteCategory,
  } = useSettingsContext();
  const location = useLocation();

  if (isSubjectMode) {
    return <Navigate to={`/settings/learning${location.search}`} replace />;
  }

  return (
    <SettingsSectionLayout
      title="Predmeti"
      description="Dodaj, preimenuj ili ukloni predmete i njihovu strukturu."
      showFooter={false}
    >
      <SubjectsTab
        categories={categories}
        subcategories={subcategories}
        categoryRecords={categoryRecords}
        cardCountByCategory={cardCountByCategory}
        onAdd={addCategory}
        onRename={renameCategory}
        onDelete={deleteCategory}
      />
    </SettingsSectionLayout>
  );
}
