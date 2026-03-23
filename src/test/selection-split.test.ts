import { describe, it, expect } from "vitest";
import { splitSelection } from "@/lib/selection-split-engine";

const MULTI_ARTICLE_TEXT = `Pojam podnesaka
Član 59
Podnesci su zahtjevi, prijedlozi, prijave i druga saopštenja kojima se stranke obraćaju organima.
Neuredan podnesak
Član 60
Ako podnesak sadrži neki formalni nedostatak koji sprečava postupanje po podnesku, organ koji je primio takav podnesak pomoći će podnosiocu da nedostatak otkloni.
Predaja podnesaka
Član 61
Podnesci se predaju neposredno organu ili se šalju poštom. Podnesci se mogu podnositi i u obliku elektronskog dokumenta.`;

const NO_TITLES_TEXT = `Član 1
Ovaj pravilnik uređuje postupak i način vršenja nadzora nad primjenom zakona.
Član 2
Inspekcijski nadzor vrši se u skladu sa odredbama ovog pravilnika.`;

const NO_ARTICLES_TEXT = `Ovo je obični tekst bez članova koji ne sadrži nikakve pravne formulacije.`;

describe("Selection Smart-Split Engine", () => {
  it("detects articles with titles (Mode A)", () => {
    const result = splitSelection(MULTI_ARTICLE_TEXT);
    expect(result.hasArticles).toBe(true);
    expect(result.modules.length).toBe(3);
    expect(result.modules[0].articleNum).toBe("59");
    expect(result.modules[0].title).toBe("čl. 59 Pojam podnesaka");
    expect(result.modules[1].title).toBe("čl. 60 Neuredan podnesak");
    expect(result.modules[2].title).toBe("čl. 61 Predaja podnesaka");
  });

  it("content is correctly assigned per article", () => {
    const result = splitSelection(MULTI_ARTICLE_TEXT);
    expect(result.modules[0].contentText).toContain("zahtjevi");
    expect(result.modules[1].contentText).toContain("formalni nedostatak");
    expect(result.modules[2].contentText).toContain("neposredno organu");
  });

  it("generates range label", () => {
    const result = splitSelection(MULTI_ARTICLE_TEXT);
    expect(result.rangeLabel).toBe("čl. 59 – čl. 61");
  });

  it("fallback title from first 7 words when no title above", () => {
    const result = splitSelection(NO_TITLES_TEXT);
    expect(result.hasArticles).toBe(true);
    expect(result.modules.length).toBe(2);
    expect(result.modules[0].title).toContain("čl. 1");
    expect(result.modules[0].title).toContain("Ovaj pravilnik");
  });

  it("returns hasArticles=false for plain text", () => {
    const result = splitSelection(NO_ARTICLES_TEXT);
    expect(result.hasArticles).toBe(false);
    expect(result.modules.length).toBe(0);
  });

  it("plainSnippet contains article header and content", () => {
    const result = splitSelection(MULTI_ARTICLE_TEXT);
    expect(result.modules[0].plainSnippet).toContain("Član 59");
    expect(result.modules[0].plainSnippet).toContain("zahtjevi");
  });

  it("contentHtml wraps lines in <p> tags", () => {
    const result = splitSelection(MULTI_ARTICLE_TEXT);
    expect(result.modules[0].contentHtml).toContain("<p>");
  });
});
