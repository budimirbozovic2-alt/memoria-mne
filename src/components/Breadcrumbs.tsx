import { ChevronRight } from "lucide-react";
import { useLocation, Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";

const ROUTE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/learn": "Učenje",
  "/review": "Konsolidacija",
  "/create": "Kreiranje",
  "/edit": "Uređivanje",
  "/cards": "Kartice",
  "/categories": "Kategorije",
  "/sources": "Izvori",
  "/database": "Kartice",
  "/settings": "Podešavanja",
  "/stats": "Statistika",
  "/knowledge-map": "Mapa znanja",
  "/metacognitive": "Dnevnik",
  "/mnemonic": "Mnemo radionica",
  "/planner": "Strateški planer",
  "/speed-reader": "Speed Reader",
  "/mind-map": "Mentalne mape",
  "/frequent-errors": "Česte greške",
  "/major-system-settings": "Major sistem",
  "/forum": "Forum",
};

const LAB_ROUTES = new Set(["/stats", "/knowledge-map", "/metacognitive", "/mnemonic", "/planner", "/speed-reader", "/mind-map"]);

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const categoryMatch = pathname.match(/^\/category\/([^/]+)/);
  const categoryId = categoryMatch?.[1];
  const [categoryName, setCategoryName] = useState<string>("");

  useEffect(() => {
    if (!categoryId) { setCategoryName(""); return; }
    db.categories.get(categoryId).then(c => setCategoryName(c?.name ?? "")).catch(() => {});
  }, [categoryId]);

  if (pathname === "/") return null;

  const crumbs: { label: string; path: string | null }[] = [
    { label: "Dashboard", path: "/" },
  ];

  if (categoryId) {
    crumbs.push({ label: categoryName || "…", path: null });
  } else if (LAB_ROUTES.has(pathname)) {
    crumbs.push({ label: "Laboratorija", path: null });
    const label = ROUTE_LABELS[pathname];
    if (label) crumbs.push({ label, path: null });
  } else {
    const label = ROUTE_LABELS[pathname];
    if (label) crumbs.push({ label, path: null });
  }

  if (crumbs.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3" />}
          {crumb.path ? (
            <Link to={crumb.path} className="hover:text-foreground transition-colors">{crumb.label}</Link>
          ) : (
            <span className="text-foreground font-medium">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
