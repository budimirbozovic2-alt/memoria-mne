import { describe, it, expect } from "vitest";
import { buildLinkedProvision } from "@/lib/source-reader/build-linked-provision";

describe("buildLinkedProvision", () => {
  it("builds a reference with sourceId, anchor and a derived label, no full text copy", () => {
    const provision = buildLinkedProvision(
      { text: "Član 5. Svrha ovog zakona je zaštita prava i sloboda građana u postupku." },
      "src-1",
    );
    expect(provision.sourceId).toBe("src-1");
    expect(provision.anchor.length).toBeGreaterThan(0);
    expect(provision.label.length).toBeGreaterThan(0);
    expect(provision.label).not.toContain("zaštita prava i sloboda građana u postupku");
    expect(provision.id).toBeTruthy();
    expect(typeof provision.createdAt).toBe("number");
  });

  it("caps the label to a short prefix even for a very long excerpt", () => {
    const longText = "Riječ ".repeat(50).trim();
    const provision = buildLinkedProvision({ text: longText }, "src-2");
    expect(provision.label.length).toBeLessThanOrEqual(80);
  });

  it("falls back to a default label for empty-ish text", () => {
    const provision = buildLinkedProvision({ text: "   " }, "src-3");
    expect(provision.label).toBe("Propis");
  });
});
