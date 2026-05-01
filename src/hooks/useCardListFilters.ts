/**
 * Filter + hierarchical sort for the flat `CardList` view.
 *
 * Returns a new array; never mutates input. Skips work when no filter is
 * active. Uses the optional `buckets` index for O(1) initial scope when the
 * narrowest active filter (chapter > subcategory > category) hits a bucket.
 */
import { useMemo } from "react";
import type { Card } from "@/lib/spaced-repetition";
import type { CategoryRecord } from "@/lib/db";
import {
  buildHierarchyOrder,
  compareCardsByHierarchy,
  EMPTY_HIERARCHY_ORDER,
} from "@/lib/card-ordering";
import type { CardBuckets } from "@/lib/card-buckets";

interface FilterOptions {
  filterCategory: string | null;
  filterSubcategory?: string | null;
  filterChapter?: string | null;
  filterType?: "all" | "essay" | "flash";
  filterTag?: string | null;
  searchQuery?: string;
  /** Category record for hierarchical sort. When omitted, falls back to flat sortOrder. */
  categoryRecord?: CategoryRecord | null;
  /** Optional pre-built bucket index for O(1) initial scoping. */
  buckets?: CardBuckets;
}

const ALL_SENTINELS = new Set(["__all__", "all", ""]);

function isAll(v: string | null | undefined): boolean {
  return v == null || ALL_SENTINELS.has(v);
}

export function useCardListFilters(cards: Card[], opts: FilterOptions): Card[] {
  const {
    filterCategory,
    filterSubcategory,
    filterChapter,
    filterType = "all",
    filterTag,
    searchQuery = "",
    categoryRecord,
    buckets,
  } = opts;

  return useMemo(() => {
    // ── Initial scope ──
    let scope: Card[];
    if (buckets && filterChapter && !isAll(filterChapter)) {
      scope = buckets.byChapter.get(filterChapter) ?? [];
    } else if (buckets && filterSubcategory && !isAll(filterSubcategory)) {
      scope = buckets.bySubcategory.get(filterSubcategory) ?? [];
    } else if (buckets && filterCategory && !isAll(filterCategory)) {
      scope = buckets.byCategory.get(filterCategory) ?? [];
    } else {
      scope = cards;
    }

    const q = searchQuery.trim().toLowerCase();
    const hasQuery = q.length > 0;

    const filtered = scope.filter((card) => {
      if (filterCategory && !isAll(filterCategory) && card.categoryId !== filterCategory) return false;
      if (filterSubcategory && !isAll(filterSubcategory) && card.subcategoryId !== filterSubcategory) return false;
      if (filterChapter && !isAll(filterChapter) && card.chapterId !== filterChapter) return false;
      if (filterType !== "all" && card.type !== filterType) return false;
      if (filterTag && !isAll(filterTag)) {
        if (!Array.isArray(card.tags) || !card.tags.includes(filterTag)) return false;
      }
      if (hasQuery) {
        const haystack = (card.question ?? "").toLowerCase();
        if (haystack.includes(q)) return true;
        const sectionHit = (card.sections ?? []).some((s) => {
          const t = (s.title ?? "").toLowerCase();
          const c = (s.content ?? "").toLowerCase();
          return t.includes(q) || c.includes(q);
        });
        if (!sectionHit) return false;
      }
      return true;
    });

    // ── Hierarchical sort ──
    const order = categoryRecord ? buildHierarchyOrder(categoryRecord) : EMPTY_HIERARCHY_ORDER;
    return [...filtered].sort((a, b) => compareCardsByHierarchy(a, b, order));
  }, [cards, filterCategory, filterSubcategory, filterChapter, filterType, filterTag, searchQuery, categoryRecord, buckets]);
}
