import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SourcesBreadcrumbProps {
  categoryId: string;
  categoryName: string;
}

/**
 * Navigation breadcrumb shown at the top of the dedicated Sources page
 * (`/category/:categoryId`). Makes it explicit that the user is in the
 * Reader/Editor context scoped to a single subject (predmet).
 */
export default function SourcesBreadcrumb({ categoryId, categoryName }: SourcesBreadcrumbProps) {
  const navigate = useNavigate();
  const subjectPath = `/subject/${categoryId}`;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Nazad na predmet"
          onClick={() => navigate(subjectPath)}
          className="h-8 w-8 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
            <li>
              <Link
                to="/"
                className="hover:text-foreground transition-colors"
              >
                Predmeti
              </Link>
            </li>
            <li aria-hidden="true" className="flex items-center">
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            </li>
            <li className="min-w-0">
              <Link
                to={subjectPath}
                className="hover:text-foreground transition-colors truncate inline-block max-w-[28ch] align-bottom"
                title={categoryName}
              >
                {categoryName}
              </Link>
            </li>
            <li aria-hidden="true" className="flex items-center">
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            </li>
            <li>
              <span aria-current="page" className="text-foreground font-medium">
                Izvori
              </span>
            </li>
          </ol>
        </nav>
      </div>

      <Badge
        variant="secondary"
        className="gap-1.5 shrink-0"
        title={`Otvoren je samo Reader/Editor za predmet "${categoryName}". Sve izmjene i čitanje djeluju isključivo nad ovim predmetom.`}
      >
        <BookOpen className="h-3 w-3" />
        Otvoreno: Izvori predmeta
      </Badge>
    </div>
  );
}
