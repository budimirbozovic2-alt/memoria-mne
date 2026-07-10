/**
 * TanStack read hooks for categories taxonomy.
 */
import { useQuery } from "@tanstack/react-query";
import { listAllCategories } from "@/lib/db/queries";
import { queryKeys } from "@/lib/query/keys";
import type { CategoryRecord } from "@/lib/db-types";

const EMPTY: readonly CategoryRecord[] = Object.freeze([]);

export function useAllCategories<T = readonly CategoryRecord[]>(
  select?: (data: readonly CategoryRecord[]) => T,
): T {
  const { data } = useQuery({
    queryKey: queryKeys.categories.all(),
    queryFn: listAllCategories,
    staleTime: Infinity,
    select: select as (data: readonly CategoryRecord[]) => unknown,
  });
  return (data ?? EMPTY) as T;
}
