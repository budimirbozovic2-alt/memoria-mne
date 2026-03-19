import { useAppContext } from "@/contexts/AppContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const Dashboard = await import("@/components/Dashboard").then(m => m.default);
const EmptyState = await import("@/components/EmptyState").then(m => m.default);

export { default as DashboardPage } from "@/views/DashboardPage";
