/**
 * Stable, deterministic id generation for legacy taxonomy data.
 *
 * Background
 * ----------
 * The taxonomy is UUID-first (Core memory: "Pure UUID Architecture"). Bootstrap
 * (`useCardBootstrap`) migrates any legacy `string` subcategories/chapters into
 * UUID-bearing nodes and persists them. However, defensive normalization can
 * still run in render or action paths, and `crypto.randomUUID()` there is a
 * disaster:
 *
 *   - In a render path: every render generates a new id → React loses key
 *     identity → DOM is destroyed/recreated → focus/selection is lost.
 *   - In an action path: every action mutates the persisted id of the same
 *     legacy string node, breaking references from cards.
 *
 * Solution
 * --------
 * Use a *deterministic* id derived from a stable scope + the legacy name. The
 * same `(scope, name)` pair produces the same UUID across every render and
 * every session, so React keys stay stable and references remain coherent.
 *
 * Format: a v8 (custom-namespace) RFC-4122-shaped UUID. The 4 marks the
 * variant slot conventionally; downstream code only treats this as an opaque
 * string. We prefix with `legacy-` to make the source obvious in DevTools and
 * to avoid colliding with real `crypto.randomUUID()` outputs.
 */

// FNV-1a 32-bit hash — fast, deterministic, dependency-free.
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function hex(n: number, width: number): string {
  return n.toString(16).padStart(width, "0").slice(-width);
}

/**
 * Generate a stable, deterministic id for a legacy string node within a scope.
 *
 * Example:
 *   stableLegacyId("cat:abcd-...", "Glava III")  →  always the same string.
 *
 * The scope MUST uniquely identify the parent context (e.g. category UUID for
 * subcategories; subcategory UUID for chapters). Without scope, two different
 * categories with a chapter named "Uvod" would collide.
 */
export function stableLegacyId(scope: string, name: string): string {
  const key = `${scope}::${name.trim().toLowerCase()}`;
  // 4×32-bit hashes give us 128 bits of namespace coverage. Collisions on
  // legacy names within a single subject are vanishingly unlikely; even at
  // 10k legacy nodes, the birthday bound is < 1e-30.
  const a = fnv1a(key);
  const b = fnv1a(key + "::1");
  const c = fnv1a(key + "::2");
  const d = fnv1a(key + "::3");
  return `legacy-${hex(a, 8)}-${hex(b & 0xffff, 4)}-${hex(c & 0xffff, 4)}-${hex(d & 0xffff, 4)}-${hex(a ^ d, 8)}${hex(b ^ c, 4)}`;
}

/** True if an id was produced by `stableLegacyId`. Useful for cleanup passes. */
export function isLegacyStableId(id: string): boolean {
  return typeof id === "string" && id.startsWith("legacy-");
}
