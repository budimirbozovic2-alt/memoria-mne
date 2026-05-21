// Phase 3 — cardMap invalidator wiring.
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eventBus, EVENT_TYPES } from "@/lib/event-bus";
import { db } from "@/lib/db";
import {
  initCardMapInvalidator,
  __teardownCardMapInvalidatorForTests,
} from "@/lib/repositories/cardMapInvalidator";
import { cardMapStore, replaceCardMap } from "@/store/useCardMapStore";
import { cardRepository } from "@/lib/repositories/cardRepository";
import type { Card } from "@/lib/spaced-repetition";

function makeCard(id: string, categoryId = "cat-A"): Card {
  return {
    id, question: `Q ${id}`, sections: [], categoryId,
    createdAt: Date.now(), readCount: 0, type: "essay",
  };
}

async function tick(ms = 30) {
  await new Promise((r) => setTimeout(r, ms));
}

describe("Phase 3 — cardMapInvalidator", () => {
  beforeEach(async () => {
    __teardownCardMapInvalidatorForTests();
    await db.open();
    await db.cards.clear();
    replaceCardMap({});
    initCardMapInvalidator();
  });

  afterEach(() => {
    __teardownCardMapInvalidatorForTests();
  });

  it("skips its own repository emissions (no re-fetch loop)", async () => {
    // Seed IDB with the row our commit will write; if the invalidator did NOT
    // skip the "repository" source it would refetch and overwrite RAM with
    // the same payload — observable by an extra notify. We assert state is
    // exactly the inline write and no async overwrite slips in later.
    const card = makeCard("a");
    cardRepository.put(card);
    const before = cardMapStore.getState().cardMap.a;
    await tick(50);
    const after = cardMapStore.getState().cardMap.a;
    // Same identity: no async overwrite from a phantom self-refetch.
    expect(after).toBe(before);
  });

  it("rehydrates RAM on external CARDS_UPDATED with cardIds", async () => {
    await db.cards.put(makeCard("b", "cat-B"));
    expect(cardMapStore.getState().cardMap.b).toBeUndefined();

    eventBus.emit(EVENT_TYPES.CARDS_UPDATED, {
      source: "orphan-cleanup",
      cardIds: ["b"],
    });

    await tick(80);
    expect(cardMapStore.getState().cardMap.b?.categoryId).toBe("cat-B");
  });

  it("deletes RAM entry when external delta drops an id from IDB", async () => {
    replaceCardMap({ c: makeCard("c") });
    // IDB does NOT contain "c" — bulkGet returns [undefined], which the
    // invalidator must surface as a deletion.
    eventBus.emit(EVENT_TYPES.CARDS_UPDATED, {
      source: "orphan-cleanup",
      cardIds: ["c"],
    });

    await tick(80);
    expect(cardMapStore.getState().cardMap.c).toBeUndefined();
  });
});
