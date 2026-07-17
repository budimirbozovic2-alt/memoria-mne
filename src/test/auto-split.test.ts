import { describe, it, expect } from "vitest";
import { detectArticles } from "@/lib/auto-split-engine";

const PRAVILNIK_NO_TITLES = `
<p>Član 1</p>
<p>Ovaj pravilnik uređuje postupak i način vršenja nadzora nad primjenom zakona.</p>
<p>Član 2</p>
<p>Inspekcijski nadzor vrši se u skladu sa odredbama ovog pravilnika i drugih propisa.</p>
<p>Član 3</p>
<p>Izrazi koji se koriste u ovom pravilniku imaju sljedeće značenje u skladu sa zakonom.</p>
<p>Član 4</p>
<p>Nadležni organ dužan je da obavijesti stranku o pokretanju postupka inspekcijskog nadzora u roku od tri dana.</p>
<p>Član 5</p>
<p>Kratko.</p>
`;

const ZAKON_WITH_TITLES = `
<p>Pojam podnesaka</p>
<p>Član 59</p>
<p>Podnesci su zahtjevi, prijedlozi, prijave i druga saopštenja kojima se stranke obraćaju organima.</p>
<p>Forma podnesaka</p>
<p>Član 60</p>
<p>Podnesci se podnose pisano ili usmeno na zapisnik.</p>
`;

describe("Auto-Split Engine", () => {
  describe("Mode B: Pravilnik bez naslova", () => {
    it("detektuje sve članove", () => {
      const articles = detectArticles(PRAVILNIK_NO_TITLES);
      expect(articles.length).toBe(5);
      expect(articles.map(a => a.articleNum)).toEqual(["1","2","3","4","5"]);
    });

    it("auto-naslov uzima prvih 6 riječi", () => {
      const articles = detectArticles(PRAVILNIK_NO_TITLES);
      
      // Član 1: "Ovaj pravilnik uređuje postupak i način vršenja..." → first 6 words
      expect(articles[0].autoTitle).toBe(true);
      expect(articles[0].title).toBe("Ovaj pravilnik uređuje postupak i način...");
      
      // Član 2
      expect(articles[1].autoTitle).toBe(true);
      expect(articles[1].title).toBe("Inspekcijski nadzor vrši se u skladu...");
      
      // Član 4: longer sentence
      expect(articles[3].autoTitle).toBe(true);
      expect(articles[3].title).toBe("Nadležni organ dužan je da obavijesti...");
    });

    it("essayName koristi auto-naslov", () => {
      const articles = detectArticles(PRAVILNIK_NO_TITLES);
      expect(articles[0].essayName).toBe("Čl. 1 Ovaj pravilnik uređuje postupak i način...");
    });

    it("kratak tekst ≤6 riječi nema trailing '...'", () => {
      const articles = detectArticles(PRAVILNIK_NO_TITLES);
      // Član 5: "Kratko." — only 1 word
      expect(articles[4].autoTitle).toBe(true);
      expect(articles[4].title).toBe("Kratko.");
      expect(articles[4].title).not.toContain("...");
    });
  });

  describe("Mode A: Zakon sa naslovima", () => {
    it("detektuje naslov iznad člana", () => {
      const articles = detectArticles(ZAKON_WITH_TITLES);
      expect(articles.length).toBe(2);
      expect(articles[0].title).toBe("Pojam podnesaka");
      expect(articles[0].autoTitle).toBe(false);
      expect(articles[1].title).toBe("Forma podnesaka");
      expect(articles[1].autoTitle).toBe(false);
    });

    it("essayName koristi originalni naslov", () => {
      const articles = detectArticles(ZAKON_WITH_TITLES);
      expect(articles[0].essayName).toBe("Čl. 59 Pojam podnesaka");
    });
  });

  describe("Content extraction", () => {
    it("plainSnippet sadrži tekst člana", () => {
      const articles = detectArticles(PRAVILNIK_NO_TITLES);
      expect(articles[0].plainSnippet).toContain("Član 1");
      expect(articles[0].plainSnippet).toContain("postupak i način vršenja nadzora");
    });

    it("contentHtml sadrži HTML", () => {
      const articles = detectArticles(PRAVILNIK_NO_TITLES);
      expect(articles[0].contentHtml).toContain("<p>");
    });
  });

  describe("Chapter heading detection (optional glava dodjela)", () => {
    const ZAKON_WITH_GLAVE = `
<p>GLAVA I — Opšte odredbe</p>
<p>Član 1</p>
<p>Prva odredba.</p>
<p>Član 2</p>
<p>Druga odredba.</p>
<p>GLAVA II — Posebne odredbe</p>
<p>Član 3</p>
<p>Treća odredba.</p>
`;

    it("is undefined when no chapterHeadingType is passed (unchanged default behavior)", () => {
      const articles = detectArticles(ZAKON_WITH_GLAVE);
      expect(articles.every((a) => a.chapterHeadingText === undefined)).toBe(true);
    });

    it("attaches the nearest preceding GLAVA heading to each article", () => {
      const articles = detectArticles(ZAKON_WITH_GLAVE, "GLAVA");
      expect(articles[0].chapterHeadingText).toBe("GLAVA I — Opšte odredbe");
      expect(articles[1].chapterHeadingText).toBe("GLAVA I — Opšte odredbe");
      expect(articles[2].chapterHeadingText).toBe("GLAVA II — Posebne odredbe");
    });

    it("is null for articles before the first heading of the chosen type", () => {
      const articles = detectArticles(PRAVILNIK_NO_TITLES, "GLAVA");
      expect(articles.every((a) => a.chapterHeadingText === null)).toBe(true);
    });

    it("does not match a different heading type than requested", () => {
      const articles = detectArticles(ZAKON_WITH_GLAVE, "DIO");
      expect(articles.every((a) => a.chapterHeadingText === null)).toBe(true);
    });

    it("matches the ordinal-prefixed \"N. GLAVA - ...\" form (e.g. Zakon o parničnom postupku)", () => {
      const zppStyle = `
<p>1. GLAVA - OSNOVNE ODREDBE</p>
<p>Član 1</p>
<p>Prva odredba.</p>
<p>Član 2</p>
<p>Druga odredba.</p>
<p>2. GLAVA - NADLEŽNOST SUDA</p>
<p>Član 3</p>
<p>Treća odredba.</p>
`;
      const articles = detectArticles(zppStyle, "GLAVA");
      expect(articles[0].chapterHeadingText).toBe("1. GLAVA - OSNOVNE ODREDBE");
      expect(articles[1].chapterHeadingText).toBe("1. GLAVA - OSNOVNE ODREDBE");
      expect(articles[2].chapterHeadingText).toBe("2. GLAVA - NADLEŽNOST SUDA");
    });

    it("still finds the heading when the article is nested inside a legal-provision wrap", () => {
      const wrapped = `
<p>GLAVA I — Opšte odredbe</p>
<div class="legal-provision">
<p>Član 1</p>
<p>Prva odredba.</p>
<p>Druga odredba.</p>
</div>
`;
      const articles = detectArticles(wrapped, "GLAVA");
      expect(articles).toHaveLength(1);
      expect(articles[0].chapterHeadingText).toBe("GLAVA I — Opšte odredbe");
      expect(articles[0].contentHtml).toContain("Druga odredba");
    });
  });

  describe("Flattening does not steal wrapped content as the next article's title", () => {
    it("keeps all wrapped paragraphs as Član 5's content instead of donating the last one to Član 6's title", () => {
      const html = `
<p>Naslov člana</p>
<p>Član 5</p>
<blockquote>
<p>Prva rečenica sadržaja.</p>
<p>Druga rečenica sadržaja.</p>
<p>Treća rečenica sadržaja.</p>
</blockquote>
<p>Član 6</p>
<p>Sadržaj drugog člana.</p>
`;
      const articles = detectArticles(html);
      expect(articles).toHaveLength(2);
      expect(articles[0].title).toBe("Naslov člana");
      expect(articles[0].contentHtml).toContain("Prva rečenica sadržaja.");
      expect(articles[0].contentHtml).toContain("Druga rečenica sadržaja.");
      expect(articles[0].contentHtml).toContain("Treća rečenica sadržaja.");
      // Član 6 has no genuine title line above it — must fall back to Mode B
      // (auto-title from its own content), not steal "Treća rečenica...".
      expect(articles[1].autoTitle).toBe(true);
      expect(articles[1].title).not.toContain("Treća rečenica");
      expect(articles[1].contentHtml).not.toContain("Treća rečenica sadržaja.");
    });

    it("still lets a genuine top-level title paragraph be reserved for the next article", () => {
      const html = `
<p>Naslov prvog člana</p>
<p>Član 1</p>
<blockquote>
<p>Prvi pasus.</p>
<p>Drugi pasus.</p>
</blockquote>
<p>Naslov drugog člana</p>
<p>Član 2</p>
<p>Sadržaj drugog člana.</p>
`;
      const articles = detectArticles(html);
      expect(articles).toHaveLength(2);
      expect(articles[0].contentHtml).toContain("Prvi pasus.");
      expect(articles[0].contentHtml).toContain("Drugi pasus.");
      expect(articles[1].autoTitle).toBe(false);
      expect(articles[1].title).toBe("Naslov drugog člana");
    });

    it("still accepts a title bundled together with its own Član line inside the same wrapper", () => {
      const html = `
<div class="legal-provision">
<p>Naslov člana</p>
<p>Član 5</p>
<p>Sadržaj.</p>
</div>
<p>Član 6</p>
<p>Sadržaj drugog člana.</p>
`;
      const articles = detectArticles(html);
      expect(articles).toHaveLength(2);
      // The title is the FIRST line pulled from the wrapper — still a valid
      // title candidate, unlike a later sibling from the same wrapper.
      expect(articles[0].autoTitle).toBe(false);
      expect(articles[0].title).toBe("Naslov člana");
      expect(articles[0].contentHtml).toContain("Sadržaj.");
    });
  });
});
