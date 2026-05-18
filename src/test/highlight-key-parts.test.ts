import { describe, it, expect } from "vitest";
import {
  compileKeyPartsMatcher,
  highlightKeyParts,
} from "@/lib/highlight-key-parts";

describe("highlight-key-parts (Phase C / P2-1)", () => {
  it("compileKeyPartsMatcher returns null for empty/short inputs", () => {
    expect(compileKeyPartsMatcher()).toBeNull();
    expect(compileKeyPartsMatcher([])).toBeNull();
    expect(compileKeyPartsMatcher(["", "a", "ab"])).toBeNull();
  });

  it("compiles a single alternation regex for many key parts", () => {
    const matcher = compileKeyPartsMatcher(["alpha", "beta", "gamma"]);
    expect(matcher).not.toBeNull();
    expect(matcher!.regex.source).toContain("alpha");
    expect(matcher!.regex.source).toContain("beta");
    expect(matcher!.regex.source).toContain("gamma");
    // Single regex object, not one per part.
    expect(matcher!.regex.flags).toBe("gi");
  });

  it("sorts longer matches first to prevent prefix-shadow", () => {
    const matcher = compileKeyPartsMatcher(["test", "testing"]);
    const out = highlightKeyParts("the testing field", matcher);
    expect(out).toContain('<mark class="key-part-highlight">testing</mark>');
    expect(out).not.toContain('<mark class="key-part-highlight">test</mark>ing');
  });

  it("wraps matches with <mark> and survives sanitization", () => {
    const out = highlightKeyParts("paragraph about alpha here", ["alpha"]);
    expect(out).toContain('<mark class="key-part-highlight">alpha</mark>');
  });

  it("reuses one matcher across many calls without recompiling", () => {
    const matcher = compileKeyPartsMatcher(["foo", "bar"])!;
    const r1 = highlightKeyParts("foo and bar", matcher);
    const r2 = highlightKeyParts("bar then foo", matcher);
    expect(r1).toContain('<mark');
    expect(r2).toContain('<mark');
    // Same regex instance, no recompile.
    expect(matcher.regex).toBe(matcher.regex);
  });

  it("returns sanitized html when no key parts", () => {
    expect(highlightKeyParts("<p>safe</p>")).toContain("safe");
  });

  it("does not match inside HTML tag attributes", () => {
    const matcher = compileKeyPartsMatcher(["class"]);
    const out = highlightKeyParts('<p class="x">hello class</p>', matcher);
    // First "class" is inside a tag and must be skipped; second is body text.
    expect(out.match(/<mark/g)?.length).toBe(1);
  });
});
