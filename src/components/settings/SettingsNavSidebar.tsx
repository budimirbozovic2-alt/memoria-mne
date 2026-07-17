import { NavLink } from "react-router-dom";
import { Brain, Palette, Workflow, Library, Database, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS: { to: string; label: string; end: boolean; icon: LucideIcon }[] = [
  { to: "/settings/learning", label: "Algoritam", end: false, icon: Brain },
  { to: "/settings/app/personalization", label: "Personalizacija", end: true, icon: Palette },
  { to: "/settings/app/workflow", label: "Workflow", end: true, icon: Workflow },
  { to: "/settings/subjects", label: "Predmeti", end: false, icon: Library },
  { to: "/settings/system", label: "Sistem", end: false, icon: Database },
];

export default function SettingsNavSidebar() {
  return (
    <aside className="w-[220px] shrink-0 py-6 pl-4 pr-2">
      <p className="px-3 mb-4 text-sm font-semibold text-foreground">Podešavanja</p>
      <nav aria-label="Podešavanja">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ to, label, end, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-secondary text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
