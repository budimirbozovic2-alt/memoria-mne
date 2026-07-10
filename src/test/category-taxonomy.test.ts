import { describe, it, expect, vi } from "vitest";
import type { CategoryRecord } from "@/lib/db-types";
import {
  bulkPutCategories,
  listAllCategories,
  replaceAllCategories,
} from "@/lib/db/queries/categories";
import {
  decodeLegacySubcategories,
  encodeCategoryPayload,
} from "@/lib/persistence/sqlite/category-codecs";
import { migrateCategoryTaxonomyToRelational } from "@/lib/persistence/sqlite/category-taxonomy-migration";
import {
  getTestSqlExecutor,
  getTestSqliteTable,
  seedTestSqliteTable,
} from "@/test/sqlite-harness";

function makeCategory(
  id: string,
  overrides: Partial<CategoryRecord> = {},
): CategoryRecord {
  return {
    id,
    name: `Category ${id}`,
    sortOrder: 0,
    subcategories: [
      {
        id: `${id}-sub-1`,
        name: "Sub 1",
        sortOrder: 0,
        chapters: [
          { id: `${id}-ch-1`, name: "Chapter 1", sortOrder: 0 },
          { id: `${id}-ch-2`, name: "Chapter 2", sortOrder: 1 },
        ],
      },
    ],
    ...overrides,
  };
}

describe("category taxonomy (relational)", () => {
  it("bulkPutCategories round-trips subcategories and chapters", async () => {
    const cat = makeCategory("cat-a", {
      examinerProfile: { difficulty: "tezak", notes: "legacy note" },
    });
    await bulkPutCategories([cat]);

    const loaded = await listAllCategories();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].subcategories).toHaveLength(1);
    expect(loaded[0].subcategories[0].chapters).toHaveLength(2);
    expect(loaded[0].examinerProfile?.notes).toBe("legacy note");

    const payload = getTestSqliteTable("categories")[0].payload as string;
    expect(JSON.parse(payload)).toEqual({
      examinerProfile: cat.examinerProfile,
    });
    expect(getTestSqliteTable("subcategories")).toHaveLength(1);
    expect(getTestSqliteTable("chapters")).toHaveLength(2);
  });

  it("replaceAllCategories replaces taxonomy atomically", async () => {
    await bulkPutCategories([makeCategory("cat-old")]);
    await replaceAllCategories([makeCategory("cat-new", { name: "New" })]);

    const loaded = await listAllCategories();
    expect(loaded.map((c) => c.id)).toEqual(["cat-new"]);
    expect(getTestSqliteTable("subcategories")).toHaveLength(1);
    expect(getTestSqliteTable("subcategories")[0].categoryId).toBe("cat-new");
  });

  // Regression: a taxonomy edit (rename subcategory) went through
  // `replaceAllCategories`, which used to `DELETE FROM categories` wholesale.
  // With `cards.categoryId ON DELETE CASCADE`, that wiped every card. The fix
  // upserts survivors and only deletes genuinely-removed category rows.
  it("replaceAllCategories never wipes the categories table when ids are kept", async () => {
    const cat = makeCategory("cat-a");
    await bulkPutCategories([cat]);
    seedTestSqliteTable("cards", [
      {
        id: "card-1",
        categoryId: "cat-a",
        subcategoryId: "cat-a-sub-1",
        chapterId: "cat-a-ch-1",
        type: "basic",
        createdAt: 1,
        updatedAt: 1,
        payload: "{}",
      },
    ]);

    const runSpy = vi.spyOn(getTestSqlExecutor(), "run");

    // Rename a subcategory — the top-level category id set is unchanged.
    const edited: CategoryRecord = {
      ...cat,
      subcategories: [{ ...cat.subcategories[0], name: "Renamed" }],
    };
    await replaceAllCategories([edited]);

    const wipedCategories = runSpy.mock.calls.some(([sql]) =>
      /^\s*DELETE\s+FROM\s+categories\s*;?\s*$/i.test(String(sql)),
    );
    expect(wipedCategories).toBe(false);

    // Card survives; the rename landed.
    expect(getTestSqliteTable("cards").map((r) => r.id)).toContain("card-1");
    const loaded = await listAllCategories();
    expect(loaded[0].subcategories[0].name).toBe("Renamed");

    runSpy.mockRestore();
  });

  it("migrateCategoryTaxonomyToRelational explodes legacy JSON payload", async () => {
    const legacyPayload = JSON.stringify({
      subcategories: [
        {
          id: "legacy-sub",
          name: "Legacy sub",
          sortOrder: 0,
          chapters: [{ id: "legacy-ch", name: "Legacy ch", sortOrder: 0 }],
        },
      ],
      examinerProfile: { difficulty: "lak" },
    });
    seedTestSqliteTable("categories", [
      {
        id: "legacy-cat",
        name: "Legacy",
        sortOrder: 0,
        color: null,
        payload: legacyPayload,
      },
    ]);

    const { migrated } = await migrateCategoryTaxonomyToRelational(
      getTestSqlExecutor(),
    );
    expect(migrated).toBe(1);

    const loaded = await listAllCategories();
    expect(loaded[0].subcategories[0].id).toBe("legacy-sub");
    expect(loaded[0].subcategories[0].chapters[0].id).toBe("legacy-ch");
    expect(loaded[0].examinerProfile?.difficulty).toBe("lak");

    const slimPayload = getTestSqliteTable("categories")[0].payload as string;
    expect(JSON.parse(slimPayload)).toEqual({
      examinerProfile: { difficulty: "lak" },
    });
    expect(decodeLegacySubcategories(slimPayload)).toEqual([]);
  });

  it("encodeCategoryPayload omits subcategories", () => {
    const cat = makeCategory("x");
    expect(encodeCategoryPayload(cat)).toBe("{}");
    expect(
      encodeCategoryPayload({
        examinerProfile: { notes: "only profile" },
      }),
    ).toBe(JSON.stringify({ examinerProfile: { notes: "only profile" } }));
  });
});
