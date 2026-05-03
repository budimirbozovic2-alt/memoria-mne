import { describe, it, expect } from "vitest";
import { parseFlashcards } from "@/lib/flashcard-parser";

describe("parseFlashcards", () => {
  it("parses a single P:/O: pair and strips prefixes", () => {
    const out = parseFlashcards("P: Šta je ugovor?\nO: Saglasnost volja.");
    expect(out).toEqual([{ question: "Šta je ugovor?", answer: "Saglasnost volja." }]);
  });

  it("is case-insensitive on prefixes", () => {
    const out = parseFlashcards("p: Q1\no: A1\nP: Q2\nO: A2");
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ question: "Q1", answer: "A1" });
  });

  it("preserves multi-line / multi-paragraph answers up to next P:", () => {
    const input = [
      "P: Šta je hipoteka?",
      "O: Založno pravo na nekretnini.",
      "",
      "Drugi pasus odgovora.",
      "Treći red.",
      "P: Sljedeće?",
      "O: Kratak.",
    ].join("\n");
    const out = parseFlashcards(input);
    expect(out).toHaveLength(2);
    expect(out[0].answer).toBe("Založno pravo na nekretnini.\n\nDrugi pasus odgovora.\nTreći red.");
    expect(out[1]).toEqual({ question: "Sljedeće?", answer: "Kratak." });
  });

  it("skips blocks missing the answer", () => {
    const out = parseFlashcards("P: Bez odgovora\nP: Q\nO: A");
    expect(out).toEqual([{ question: "Q", answer: "A" }]);
  });

  it("ignores stray O: without preceding P:", () => {
    const out = parseFlashcards("O: izgubljeni odgovor\nP: Q\nO: A");
    expect(out).toEqual([{ question: "Q", answer: "A" }]);
  });

  it("ignores text before the first P:", () => {
    const out = parseFlashcards("Header note\nIgnore me\nP: Q\nO: A");
    expect(out).toEqual([{ question: "Q", answer: "A" }]);
  });

  it("tolerates indentation/whitespace around the marker", () => {
    const out = parseFlashcards("   P:   Q1   \n  O:  A1  ");
    expect(out).toEqual([{ question: "Q1", answer: "A1" }]);
  });

  it("returns [] for empty / non-string input", () => {
    expect(parseFlashcards("")).toEqual([]);
    expect(parseFlashcards("   \n\n  ")).toEqual([]);
  });

  it("never leaks the P:/O: prefixes into output", () => {
    const out = parseFlashcards("P: Q\nO: A line with P: inside? yes\nstill answer");
    expect(out).toHaveLength(1);
    expect(out[0].question).toBe("Q");
    // The "P:" inside the answer body is at column > 0 → not a marker, kept verbatim.
    expect(out[0].answer).toContain("A line with P: inside?");
    expect(out[0].answer.startsWith("P:")).toBe(false);
    expect(out[0].answer.startsWith("O:")).toBe(false);
  });
});
