// ─────────────────────────────────────────────────────────────────────────────
// C4 — Collapse Ref-Delta into a single Zustand atom.
//
// Historically `cardMapRef` (mutable ref) and `cardMap` (React state) were
// two parallel structures kept in lockstep by every CRUD/import/category
// path ("Ref-Delta pattern"). Any code path that forgot to sync the ref
// silently corrupted reads.
//
// This store collapses both into ONE atom: the Zustand store IS the ref AND
// the rendered state. The provider exposes ref-shaped and setter-shaped
// facades so existing call sites keep working unchanged, but under the hood
// they all hit the same atom.
// ─────────────────────────────────────────────────────────────────────────────
import { createStore } from "zustand/vanilla";
import { useSyncExternalStore } from "react";
import type { CardMap } from "@/lib/persist-queue";

interface CardMapState {
  cardMap: CardMap;
}

export const cardMapStore = createStore<CardMapState>(() => ({
  cardMap: {},
}));

/** React subscription hook — re-renders only when the cardMap reference changes. */
export function useCardMap(): CardMap {
  return useSyncExternalStore(
    cardMapStore.subscribe,
    () => cardMapStore.getState().cardMap,
    () => cardMapStore.getState().cardMap,
  );
}

/** Synchronous read — equivalent to the old `cardMapRef.current`. */
export function getCardMap(): CardMap {
  return cardMapStore.getState().cardMap;
}

/** Replace the entire cardMap (rare — bootstrap, full reload, restore). */
export function replaceCardMap(next: CardMap): void {
  cardMapStore.setState({ cardMap: next });
}

/**
 * setState-style updater compatible with `React.Dispatch<SetStateAction<CardMap>>`.
 * Accepts either a new map or an `(prev) => next` updater.
 */
export type CardMapSetter = (action: CardMap | ((prev: CardMap) => CardMap)) => void;

export const setCardMap: CardMapSetter = (action) => {
  cardMapStore.setState((s) => {
    const next = typeof action === "function"
      ? (action as (prev: CardMap) => CardMap)(s.cardMap)
      : action;
    if (next === s.cardMap) return s;
    return { cardMap: next };
  });
};

/**
 * Ref-shaped facade. `current` getter reads live from the store, setter
 * commits via setState. In-place mutation (`facade.current[id] = card`)\\
 * mutates the store's cardMap object directly — which is the explicit goal
 * of C4: ref and state are now the same atom.
 *
 * IMPORTANT: in-place mutation does NOT trigger React re-renders. Mutators
 * must still follow up with `setCardMap(prev => ({ ...prev, [id]: card }))`
 * — same contract the old Ref-Delta pattern required.
 */
export interface CardMapRefFacade {
  current: CardMap;
}

export const cardMapRefFacade: CardMapRefFacade = {
  get current() {
    return cardMapStore.getState().cardMap;
  },
  set current(next: CardMap) {
    cardMapStore.setState({ cardMap: next });
  },
};
