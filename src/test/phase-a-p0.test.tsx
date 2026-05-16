/**
 * Phase A / P0 smoke tests.
 *
 * Verificira:
 *   1. CardForm na unmount NE mutira `document.body.style.pointerEvents`
 *      (vlasništvo je strogo u `installBodyPointerEventsGuard`).
 *   2. `persistQueue` je observable — `subscribe()` se okida na enqueue /
 *      flush, što je zamijenilo 100ms polling u `usePersistingState`.
 *   3. `usePersistingState` ne instalira `setInterval` (ne curi resurs).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderHook } from "@testing-library/react";

import { persistQueue } from "@/lib/persist-queue";
import { usePersistingState } from "@/hooks/usePersistingState";

// ── 1. CardForm body.style guard ───────────────────────────────────────
describe("CardForm — ne mutira document.body.style.pointerEvents", () => {
  beforeEach(() => {
    document.body.style.pointerEvents = "";
  });
  afterEach(() => {
    cleanup();
    document.body.style.pointerEvents = "";
  });

  it("mount + unmount ne dira body.style.pointerEvents", async () => {
    const CardForm = (await import("@/components/CardForm")).default;
    document.body.style.pointerEvents = "none"; // simulira aktivan Radix lock

    const { unmount } = render(
      <MemoryRouter>
        <CardForm
          categories={["Test"]}
          subcategories={{ Test: [] }}
          onSave={() => {}}
          onSaveFlash={() => {}}
          onCancel={() => {}}
        />
      </MemoryRouter>,
    );
    expect(document.body.style.pointerEvents).toBe("none");
    unmount();
    // Bug-fix invariant: CardForm NE smije resetovati body.style — guard je vlasnik.
    expect(document.body.style.pointerEvents).toBe("none");
  });
});

// ── 2. persistQueue observable ─────────────────────────────────────────
describe("persistQueue — observable subscribe", () => {
  it("notifikuje subscribere kad se queue mijenja", async () => {
    const listener = vi.fn();
    const unsub = persistQueue.subscribe(listener);

    persistQueue.schedule({
      type: "put",
      // @ts-expect-error — fixture card, partial Card type za test
      card: { id: "test-1", question: "q", sections: [], updatedAt: Date.now() },
    });
    await Promise.resolve(); // drain microtask
    expect(listener).toHaveBeenCalled();
    unsub();
  });

  it("unsubscribe stvarno otkači listener", async () => {
    const listener = vi.fn();
    const unsub = persistQueue.subscribe(listener);
    unsub();
    persistQueue.schedule({
      type: "put",
      // @ts-expect-error — partial fixture
      card: { id: "test-2", question: "q", sections: [], updatedAt: Date.now() },
    });
    await Promise.resolve();
    expect(listener).not.toHaveBeenCalled();
  });
});

// ── 3. usePersistingState — bez setInterval-a ─────────────────────────
describe("usePersistingState — nema poll-loop-a", () => {
  it("ne instalira setInterval", () => {
    const spy = vi.spyOn(globalThis, "setInterval");
    const { unmount } = renderHook(() => usePersistingState());
    expect(spy).not.toHaveBeenCalled();
    unmount();
    spy.mockRestore();
  });

  it("reaktivno čita iz queue-a kroz subscribe", async () => {
    const { result } = renderHook(() => usePersistingState());
    expect(result.current.hasPending).toBe(persistQueue.hasPending());

    await act(async () => {
      persistQueue.schedule({
        type: "put",
        // @ts-expect-error — partial fixture
        card: { id: "test-3", question: "q", sections: [], updatedAt: Date.now() },
      });
      await Promise.resolve();
    });
    expect(result.current.hasPending).toBe(true);
  });
});
