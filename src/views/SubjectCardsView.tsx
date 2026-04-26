import { useParams, Link, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { ArrowLeft, Layers, BookOpen, Network, Brain, Settings } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCardData, useCategoryData, useCardActions, useUIContext } from "@/contexts/AppContext";
import type { SubcategoryNode } from "@/lib/db";
import CardViewMode from "@/components/category/CardViewMode";
import CardOrgMode from "@/components/category/CardOrgMode";
import StructureManagerDialog from "@/components/category/StructureManagerDialog";
import PassiveReader from "@/components/subject-cards/PassiveReader";
import MnemonicModule from "@/components/MnemonicModule";

export default function SubjectCardsView() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();

  const { cards: allCards, ready } = useCardData();
  const { categoryRecords } = useCategoryData();
  const {
    addCard, addFlashCard, patchCard, toggleTag, deleteCard,
    addSubcategory, renameSubcategory, deleteSubcategory,
    addChapter, renameChapter, deleteChapter,
    reorderSubcategories, reorderChapters,
  } = useCardActions();
  const { setEditingCard } = useUIContext();

  const category = useMemo(
    () => categoryRecords.find(c => c.id === categoryId) ?? null,
    [categoryRecords, categoryId]
  );

  const cards = useMemo(
    () => categoryId ? allCards.filter(c => c.categoryId === categoryId) : [],
    [allCards, categoryId]
  );

  const subcategoryNodes: SubcategoryNode[] = useMemo(() => {
    if (!category?.subcategories) return [];
    return (category.subcategories as SubcategoryNode[]).map((s) =>
      typeof s === "string" ? { id: s, name: s, chapters: [], sortOrder: 0 } as SubcategoryNode : s
    );
  }, [category?.subcategories]);

  const [tab, setTab] = useState("manage");
  const [structureOpen, setStructureOpen] = useState(false);

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Predmet nije pronađen.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to={`/subject/${categoryId}`}
          className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Nazad na predmet"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">{category.name}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Kartice — pregled, čitanje, struktura i mnemonika</p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
          <TabsTrigger value="manage" className="gap-1.5">
            <Layers className="h-4 w-4" />
            <span>Pregled</span>
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{cards.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="read" className="gap-1.5">
            <BookOpen className="h-4 w-4" />
            <span>Pasivno čitanje</span>
          </TabsTrigger>
          <TabsTrigger value="structure" className="gap-1.5">
            <Network className="h-4 w-4" />
            <span>Struktura</span>
          </TabsTrigger>
          <TabsTrigger value="mnemonics" className="gap-1.5">
            <Brain className="h-4 w-4" />
            <span>Mnemonika</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="pt-4">
          <CardViewMode
            cards={cards}
            categoryId={categoryId!}
            allCategories={categoryRecords}
            patchCard={patchCard}
            toggleTag={toggleTag}
            addCard={addCard}
            addFlashCard={addFlashCard}
            onDelete={deleteCard}
            onEdit={(card) => {
              sessionStorage.setItem("sr-edit-return-view", "subject-cards:" + categoryId);
              setEditingCard(card);
              navigate("/edit");
            }}
          />
        </TabsContent>

        <TabsContent value="read" className="pt-4">
          <PassiveReader cards={cards} subcategoryNodes={subcategoryNodes} />
        </TabsContent>

        <TabsContent value="structure" className="pt-4 space-y-3">
          <div className="flex items-center justify-end">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs"
              onClick={() => setStructureOpen(true)}
            >
              <Settings className="h-3.5 w-3.5" />
              Uredi potkategorije i glave
            </Button>
          </div>
          <CardOrgMode
            cards={cards}
            categoryId={categoryId!}
            subcategoryNodes={subcategoryNodes}
            patchCard={patchCard}
          />
        </TabsContent>

        <TabsContent value="mnemonics" className="pt-4">
          <MnemonicModule embedded categoryFilter={categoryId} />
        </TabsContent>
      </Tabs>

      <StructureManagerDialog
        open={structureOpen}
        onOpenChange={setStructureOpen}
        categoryId={categoryId!}
        categoryName={category.name}
        subcategoryNodes={subcategoryNodes}
        onAddSubcategory={addSubcategory}
        onRenameSubcategory={renameSubcategory}
        onDeleteSubcategory={deleteSubcategory}
        onReorderSubcategories={reorderSubcategories}
        onAddChapter={addChapter}
        onRenameChapter={renameChapter}
        onDeleteChapter={deleteChapter}
        onReorderChapters={reorderChapters}
      />
    </div>
  );
}
