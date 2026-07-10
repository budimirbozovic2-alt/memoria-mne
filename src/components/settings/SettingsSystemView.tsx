import { Navigate, useLocation } from "react-router-dom";
import SystemTab from "@/components/settings/SystemTab";
import SettingsSectionLayout from "@/components/settings/SettingsSectionLayout";
import { useSettingsContext } from "@/components/settings/SettingsContext";

export default function SettingsSystemView() {
  const { isSubjectMode } = useSettingsContext();
  const location = useLocation();

  if (isSubjectMode) {
    return <Navigate to={`/settings/learning${location.search}`} replace />;
  }

  return (
    <SettingsSectionLayout
      title="Sistem"
      description="Backup, reset progresa, ažuriranja i zdravlje baze."
      showFooter={false}
    >
      <SystemTab />
    </SettingsSectionLayout>
  );
}
