/**
 * Provjera da `isOverlayOpen` precizno detektuje sve relevantne overlay
 * tipove (uključujući nested/stacked dijaloge i vaul drawer), tako da
 * guard ne oslobodi <body> dok bilo koji od njih i dalje drži lock.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  installBodyPointerEventsGuard,
  isOverlayOpen,
} from "@/lib/body-pointer-events-guard";

function nextRaf(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

function add(attrs: Record<string, string>): HTMLElement {
  const el = document.createElement("div");
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

describe("isOverlayOpen — precizna detekcija", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.body.style.pointerEvents = "";
    document.body.removeAttribute("data-scroll-locked");
  });

  it("hvata Radix Dialog", () => {
    add({ role: "dialog", "data-state": "open" });
    expect(isOverlayOpen()).toBe(true);
  });

  it("hvata Radix AlertDialog", () => {
    add({ role: "alertdialog", "data-state": "open" });
    expect(isOverlayOpen()).toBe(true);
  });

  it("hvata Vaul drawer", () => {
    add({ "data-vaul-drawer": "", "data-state": "open" });
    expect(isOverlayOpen()).toBe(true);
  });

  it("hvata Radix FocusScope guard (proxy za bilo koji aktivni layer)", () => {
    add({ "data-radix-focus-guard": "" });
    expect(isOverlayOpen()).toBe(true);
  });

  it("hvata react-remove-scroll lock na body", () => {
    document.body.setAttribute("data-scroll-locked", "1");
    expect(isOverlayOpen()).toBe(true);
  });

  it("vraća false kada nema aktivnih overlay markera", () => {
    add({ role: "dialog", "data-state": "closed" });
    expect(isOverlayOpen()).toBe(false);
  });
});

describe("guard ne oslobađa body dok je nested/stacked dialog otvoren", () => {
  let dispose: (() => void) | null = null;

  beforeEach(() => {
    document.body.innerHTML = "";
    document.body.style.pointerEvents = "";
    document.body.removeAttribute("data-scroll-locked");
    dispose = installBodyPointerEventsGuard();
  });
  afterEach(() => {
    dispose?.();
    dispose = null;
  });

  it("dva otvorena dialoga: zatvaranje gornjeg ne oslobađa body", async () => {
    const outer = add({ role: "dialog", "data-state": "open" });
    const inner = add({ role: "dialog", "data-state": "open" });
    document.body.style.pointerEvents = "none";

    inner.setAttribute("data-state", "closed");
    document.body.style.pointerEvents = "none";
    await nextRaf(); await nextRaf();

    expect(document.body.style.pointerEvents).toBe("none");

    // Zatvaranje i drugog dialoga oslobađa body.
    outer.setAttribute("data-state", "closed");
    document.body.style.pointerEvents = "none";
    await nextRaf(); await nextRaf();

    expect(document.body.style.pointerEvents).toBe("");
  });

  it("aktivni focus-guard sprječava oslobađanje", async () => {
    add({ "data-radix-focus-guard": "" });
    document.body.style.pointerEvents = "none";
    await nextRaf(); await nextRaf();
    expect(document.body.style.pointerEvents).toBe("none");
  });

  it("data-scroll-locked sprječava oslobađanje", async () => {
    document.body.setAttribute("data-scroll-locked", "1");
    document.body.style.pointerEvents = "none";
    await nextRaf(); await nextRaf();
    expect(document.body.style.pointerEvents).toBe("none");

    document.body.removeAttribute("data-scroll-locked");
    await nextRaf(); await nextRaf();
    expect(document.body.style.pointerEvents).toBe("");
  });
});
